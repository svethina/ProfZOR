/**
 * Чистая логика ProfZOR (без DOM).
 * Используется app.js в браузере и тестами в Node.
 */
(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else {
    global.ProfzorLogic = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DEFAULT_RADICAL_IDS = [
    "hysteroid",
    "epileptoid",
    "paranoid",
    "schizoid",
    "hyperthym",
    "emotive",
    "anxious",
  ];

  function emptyRadicalData() {
    return {
      observations: [],
      intensity: "none",
      expertComment: "",
    };
  }

  function obsCount(data) {
    return data && data.observations ? data.observations.length : 0;
  }

  function reindexOrders(list) {
    list.forEach(function (item, index) {
      item.order = index + 1;
    });
    return list;
  }

  function sortByOrder(list) {
    return (list || []).slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
  }

  function clampTransferredLength(rawText, pointer) {
    var len = String(rawText || "").length;
    var pos = typeof pointer === "number" && isFinite(pointer) ? pointer : 0;
    if (pos < 0) return 0;
    if (pos > len) return len;
    return pos;
  }

  function extractDeltaSinceTransfer(rawText, pointer) {
    var raw = String(rawText || "");
    var pos = clampTransferredLength(raw, pointer);
    var chunk = raw.slice(pos).trim();
    return chunk || null;
  }

  /**
   * Перенос дельты сырых заметок в наблюдение.
   * Сырой текст не изменяется (поле не очищается).
   */
  function applyTransferDelta(rawText, lastTransferredLength, radicalId) {
    var raw = String(rawText || "");
    var pointer = clampTransferredLength(raw, lastTransferredLength);
    var chunk = extractDeltaSinceTransfer(raw, pointer);

    if (!chunk) {
      return {
        assigned: false,
        rawText: raw,
        lastTransferredLength: pointer,
        observation: null,
      };
    }

    return {
      assigned: true,
      rawText: raw,
      lastTransferredLength: raw.length,
      observation: {
        text: chunk,
        radicalId: radicalId,
      },
    };
  }

  var OBSERVATION_SOURCES = [
    "general_question",
    "check_question",
    "free_note",
    "behavior",
  ];

  function emptyAiState() {
    return {
      status: "idle",
      updatedAt: null,
      radicalHypotheses: [],
      declaredMotives: [],
      trueMotiveHypothesis: null,
      contradictions: [],
      coverageGaps: [],
      nextQuestions: [],
      insufficientEvidence: false,
      disclaimer:
        "Гипотеза, не диагноз. Требует подтверждения эксперта.",
    };
  }

  function emptyMotivation() {
    return {
      declared: [],
      hypothesized: null,
      confirmed: null,
      tensions: [],
    };
  }

  function normalizeObservationFragment(item, radicalId, index) {
    var raw = item || {};
    var source = raw.source;
    if (OBSERVATION_SOURCES.indexOf(source) < 0) source = "free_note";
    var social = raw.socialDesirability;
    if (social !== "suspected" && social !== "confirmed") social = "none";
    return {
      id: raw.id || "obs_" + (index != null ? index : 0),
      text: raw.text || "",
      radicalId: raw.radicalId || radicalId || null,
      order: raw.order || (index != null ? index + 1 : 1),
      createdAt: raw.createdAt || null,
      source: source,
      questionId: raw.questionId || null,
      declaredMotiveHint: Boolean(raw.declaredMotiveHint),
      socialDesirability: social,
      aiSuggestion: raw.aiSuggestion || null,
    };
  }

  function migrateObservationsList(raw, radicalId) {
    if (Array.isArray(raw)) {
      return reindexOrders(
        raw.map(function (item, i) {
          return normalizeObservationFragment(
            item,
            (item && item.radicalId) || radicalId,
            i
          );
        })
      );
    }
    if (typeof raw === "string" && String(raw).trim()) {
      return [
        normalizeObservationFragment(
          { text: String(raw).trim(), source: "free_note" },
          radicalId,
          0
        ),
      ];
    }
    return [];
  }

  function normalizeProtocolQuestion(q, index, uidFn) {
    var makeId = function (prefix) {
      if (typeof uidFn === "function") return uidFn(prefix);
      return (prefix || "q") + "_" + index;
    };
    if (typeof q === "string") {
      return {
        id: makeId("q"),
        text: q,
        order: index + 1,
        asked: false,
        askedAt: null,
        answerId: null,
        radicalId: null,
      };
    }
    var item = q && typeof q === "object" ? q : {};
    return {
      id: item.id || makeId("q"),
      text:
        typeof item.text === "string" ? item.text : String(item.text || ""),
      order: item.order || index + 1,
      asked: Boolean(item.asked),
      askedAt: item.askedAt || null,
      answerId: item.answerId || null,
      radicalId: item.radicalId || null,
    };
  }

  function isQuestionCovered(q) {
    return Boolean(q && q.asked && q.answerId);
  }

  function markQuestionAsked(q, atIso) {
    var next = normalizeProtocolQuestion(q, q && q.order ? q.order - 1 : 0);
    next.asked = true;
    if (!next.askedAt) next.askedAt = atIso || null;
    return next;
  }

  function linkAnswerToQuestion(questions, questionId, observationId, atIso) {
    return (questions || []).map(function (q, i) {
      var item = normalizeProtocolQuestion(q, i);
      if (item.id !== questionId) return item;
      item.asked = true;
      if (!item.askedAt) item.askedAt = atIso || null;
      item.answerId = observationId || item.answerId;
      return item;
    });
  }

  function radicalsWithoutSupport(radicalsMap, radicalIds) {
    var ids = radicalIds && radicalIds.length ? radicalIds : DEFAULT_RADICAL_IDS;
    var map = radicalsMap || {};
    return ids.filter(function (id) {
      return obsCount(map[id] || emptyRadicalData()) === 0;
    });
  }

  function motivationDraftLines(motivation) {
    var mot = {
      declared: [],
      hypothesized: null,
      confirmed: null,
      tensions: [],
    };
    var src = motivation && typeof motivation === "object" ? motivation : {};
    Object.keys(mot).forEach(function (k) {
      if (Object.prototype.hasOwnProperty.call(src, k)) mot[k] = src[k];
    });
    function asText(val) {
      if (!val) return "";
      if (typeof val === "string") return val;
      return val.summary || val.text || "";
    }
    var conf = asText(mot.confirmed);
    if (conf) {
      return [
        "Мотивация (подтверждено экспертом):",
        conf,
      ];
    }
    var hyp = asText(mot.hypothesized);
    if (hyp) {
      return [
        "Гипотеза ИИ по мотивации (не подтверждено экспертом, не является выводом):",
        hyp,
      ];
    }
    return [];
  }

  function mergeAiState(current, partial) {
    var base = emptyAiState();
    var cur = current && typeof current === "object" ? current : {};
    var add = partial && typeof partial === "object" ? partial : {};
    var merged = {};
    Object.keys(base).forEach(function (key) {
      merged[key] = Object.prototype.hasOwnProperty.call(add, key)
        ? add[key]
        : Object.prototype.hasOwnProperty.call(cur, key)
          ? cur[key]
          : base[key];
    });
    return merged;
  }

  function appendObservation(list, observation, index) {
    var next = (list || []).slice();
    var frag = normalizeObservationFragment(
      observation || {},
      observation && observation.radicalId,
      index != null ? index : next.length
    );
    if (!observation || !observation.id) {
      frag.id = "obs_" + (index != null ? index : next.length);
    }
    next.push(frag);
    return reindexOrders(next);
  }

  function numberedObservations(list) {
    return sortByOrder(list || [])
      .filter(function (item) {
        return String(item.text || "").trim();
      })
      .map(function (item, index) {
        return {
          number: index + 1,
          text: String(item.text || "").trim(),
          radicalId: item.radicalId || null,
        };
      });
  }

  function sortOrderByObservationCount(radicalsMap, radicalIds) {
    var base = (radicalIds && radicalIds.length
      ? radicalIds
      : DEFAULT_RADICAL_IDS
    ).slice();
    var map = radicalsMap || {};
    return base.slice().sort(function (a, b) {
      var ca = obsCount(map[a] || emptyRadicalData());
      var cb = obsCount(map[b] || emptyRadicalData());
      if (cb !== ca) return cb - ca;
      return base.indexOf(a) - base.indexOf(b);
    });
  }

  function buildSummaryRows(radicalsMap, radicalIds) {
    var ids = radicalIds && radicalIds.length ? radicalIds : DEFAULT_RADICAL_IDS;
    var map = radicalsMap || {};
    var order = sortOrderByObservationCount(map, ids);
    return order.map(function (id, index) {
      var data = map[id] || emptyRadicalData();
      return {
        rank: index + 1,
        radicalId: id,
        observationCount: obsCount(data),
        observations: numberedObservations(data.observations),
      };
    });
  }

  return {
    DEFAULT_RADICAL_IDS: DEFAULT_RADICAL_IDS,
    OBSERVATION_SOURCES: OBSERVATION_SOURCES,
    emptyRadicalData: emptyRadicalData,
    emptyAiState: emptyAiState,
    emptyMotivation: emptyMotivation,
    obsCount: obsCount,
    reindexOrders: reindexOrders,
    sortByOrder: sortByOrder,
    clampTransferredLength: clampTransferredLength,
    extractDeltaSinceTransfer: extractDeltaSinceTransfer,
    applyTransferDelta: applyTransferDelta,
    normalizeObservationFragment: normalizeObservationFragment,
    migrateObservationsList: migrateObservationsList,
    normalizeProtocolQuestion: normalizeProtocolQuestion,
    isQuestionCovered: isQuestionCovered,
    markQuestionAsked: markQuestionAsked,
    linkAnswerToQuestion: linkAnswerToQuestion,
    radicalsWithoutSupport: radicalsWithoutSupport,
    mergeAiState: mergeAiState,
    motivationDraftLines: motivationDraftLines,
    appendObservation: appendObservation,
    numberedObservations: numberedObservations,
    sortOrderByObservationCount: sortOrderByObservationCount,
    buildSummaryRows: buildSummaryRows,
  };
});
