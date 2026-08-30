/**
 * Системный и пользовательский промпт + схема JSON-ответа модели.
 */
(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else {
    global.ProfzorAiPrompts = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var RESPONSE_SCHEMA = {
    declaredMotives: [{ text: "", quoteIds: [] }],
    radicalHypotheses: [
      {
        radicalId:
          "hysteroid|epileptoid|paranoid|schizoid|hyperthym|emotive|anxious",
        confidence: "low|medium|high",
        markers: [],
        quoteIds: [],
      },
    ],
    trueMotiveHypothesis: {
      drivers: [],
      leadingRadicals: [],
      tension: [],
      confidence: "low|medium|high",
      summary: "",
    },
    contradictions: [
      {
        whatDeclared: "",
        whatObserved: "",
        whyItMatters: "",
        probeQuestion: "",
      },
    ],
    coverageGaps: [],
    nextQuestions: [],
    insufficientEvidence: false,
    disclaimer: "Гипотеза, не диагноз.",
  };

  var SYSTEM_PROMPT =
    "Ты — ассистент эксперта по 7 радикалам в ProfZOR.\n" +
    "Задача: отличить заявленную мотивацию респондента от гипотезы истинной.\n" +
    "Запреты: диагноз; уверенность без цитат; переписывание radicalId эксперта; ранжирование по числу записей.\n" +
    "Стиль: короткие гипотезы, маркеры, один следующий вопрос.\n" +
    "Опирайся только на маркеры из блока knowledge и на факты пакета. Не выдумывай цитаты.\n" +
    "Если данных мало — insufficientEvidence=true и не заполняй истинную мотивацию красивым текстом.\n" +
    "Ответ — только JSON по схеме, без эссе.";

  function userPrompt(packet, knowledgeDigest) {
    return (
      "Режим: разбор протокола интервью.\n\n" +
      "База маркеров (кратко):\n" +
      knowledgeDigest +
      "\n\nПакет:\n" +
      JSON.stringify(packet) +
      "\n\nВерни JSON со полями: declaredMotives, radicalHypotheses (не больше 3, с quoteIds), " +
      "trueMotiveHypothesis, contradictions, coverageGaps, nextQuestions (короткие, можно задать вслух), " +
      "insufficientEvidence, disclaimer."
    );
  }

  function knowledgeDigest(knowledge) {
    if (!knowledge || !knowledge.RADICALS) return "";
    return knowledge.RADICALS.map(function (r) {
      return (
        r.name +
        " (" +
        r.id +
        "): драйвер " +
        r.trueDriver +
        "; речь: " +
        (r.speechMarkers || []).slice(0, 3).join("; ") +
        "; маски: " +
        (r.socialMasks || []).slice(0, 2).join("; ")
      );
    }).join("\n");
  }

  function buildCopyPayload(packet, knowledge) {
    var digest = knowledgeDigest(knowledge);
    return {
      system: SYSTEM_PROMPT,
      user: userPrompt(packet, digest),
      schema: RESPONSE_SCHEMA,
    };
  }

  return {
    SYSTEM_PROMPT: SYSTEM_PROMPT,
    RESPONSE_SCHEMA: RESPONSE_SCHEMA,
    userPrompt: userPrompt,
    knowledgeDigest: knowledgeDigest,
    buildCopyPayload: buildCopyPayload,
  };
});
