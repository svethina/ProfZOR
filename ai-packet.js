/**
 * Канонический пакет интервью для ИИ. Без DOM. Тестируется как interview-logic.js.
 * Не кладёт весь LocalStorage и не передаёт motivation.confirmed как истину.
 */
(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory(
      typeof require === "function" ? require("./interview-logic.js") : global.ProfzorLogic
    );
  } else {
    global.ProfzorAiPacket = factory(global.ProfzorLogic);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Logic) {
  "use strict";

  function stripPii(respondent) {
    var s = String(respondent || "").trim();
    if (!s) return "";
    if (/^р-?\d+/i.test(s) || /^r-?\d+/i.test(s)) return s;
    if (s.length <= 4) return s;
    return s.slice(0, 1) + "…";
  }

  function compactQuestion(q) {
    return {
      id: q.id || null,
      text: q.text || "",
      asked: Boolean(q.asked),
      askedAt: q.askedAt || null,
      answerId: q.answerId || null,
      radicalId: q.radicalId || null,
      covered: Logic.isQuestionCovered(q),
    };
  }

  function compactFragment(obs) {
    return {
      id: obs.id || null,
      text: String(obs.text || "").trim(),
      source: obs.source || "free_note",
      questionId: obs.questionId || null,
      radicalId: obs.radicalId || null,
      declaredMotiveHint: Boolean(obs.declaredMotiveHint),
      socialDesirability: obs.socialDesirability || "none",
    };
  }

  function collectFragments(radicalsMap, radicalIds) {
    var ids = radicalIds || Logic.DEFAULT_RADICAL_IDS;
    var map = radicalsMap || {};
    var list = [];
    ids.forEach(function (id) {
      var data = map[id] || Logic.emptyRadicalData();
      (data.observations || []).forEach(function (obs) {
        if (!String(obs.text || "").trim()) return;
        list.push(compactFragment(obs));
      });
    });
    return list;
  }

  function emptyZones(interview) {
    var uncoveredGeneral = (interview.generalQuestions || []).filter(function (q) {
      return !Logic.isQuestionCovered(q);
    }).map(function (q) {
      return { id: q.id, text: q.text, asked: Boolean(q.asked) };
    });
    var uncoveredChecks = (interview.checkQuestionsBank || []).filter(function (q) {
      return q.asked && !q.answerId;
    }).map(function (q) {
      return { id: q.id, text: q.text, radicalId: q.radicalId };
    });
    return {
      radicalsWithoutSupport: Logic.radicalsWithoutSupport(
        interview.radicals,
        Logic.DEFAULT_RADICAL_IDS
      ),
      questionsAskedWithoutAnswer: uncoveredChecks.concat(
        uncoveredGeneral.filter(function (q) {
          return q.asked;
        })
      ),
      generalNotAsked: uncoveredGeneral.filter(function (q) {
        return !q.asked;
      }).length,
    };
  }

  function buildPacket(interview, options) {
    var opts = options || {};
    var data = interview || {};
    var includeRaw = Boolean(opts.includeRawNotes);
    var packet = {
      version: "1.0",
      purpose: "profzor-ai-packet",
      respondentCode: stripPii(data.respondent),
      date: data.date || "",
      generalQuestions: (data.generalQuestions || []).map(compactQuestion),
      checkQuestions: (data.checkQuestionsBank || []).map(compactQuestion),
      fragments: collectFragments(data.radicals, Logic.DEFAULT_RADICAL_IDS),
      emptyZones: emptyZones(data),
      instruction:
        "Опирайся только на маркеры из базы знаний. Не ставь диагноз. Не выдумывай цитаты. Не переписывай radicalId эксперта. Заявленное ≠ истинное, пока нет противоречия в фактах.",
    };
    if (includeRaw && data.rawNotes) {
      packet.rawNotes = String(data.rawNotes);
    }
    return packet;
  }

  function packetToText(packet) {
    return JSON.stringify(packet, null, 2);
  }

  function parsePacket(text) {
    var data = typeof text === "string" ? JSON.parse(text) : text;
    if (!data || data.purpose !== "profzor-ai-packet") {
      throw new Error("Не пакет ProfZOR");
    }
    return data;
  }

  return {
    stripPii: stripPii,
    buildPacket: buildPacket,
    packetToText: packetToText,
    parsePacket: parsePacket,
    emptyZones: emptyZones,
  };
});
