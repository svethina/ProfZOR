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

  function appendObservation(list, observation, index) {
    var next = (list || []).slice();
    next.push({
      id: observation.id || "obs_" + (index != null ? index : next.length),
      text: observation.text || "",
      radicalId: observation.radicalId || null,
      order: observation.order || next.length + 1,
      createdAt: observation.createdAt || null,
    });
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
    emptyRadicalData: emptyRadicalData,
    obsCount: obsCount,
    reindexOrders: reindexOrders,
    sortByOrder: sortByOrder,
    clampTransferredLength: clampTransferredLength,
    extractDeltaSinceTransfer: extractDeltaSinceTransfer,
    applyTransferDelta: applyTransferDelta,
    appendObservation: appendObservation,
    numberedObservations: numberedObservations,
    sortOrderByObservationCount: sortOrderByObservationCount,
    buildSummaryRows: buildSummaryRows,
  };
});
