/**
 * Демоверсия: вымышленный респондент Р-DEMO. Без ФИО и без вызова OpenRouter.
 */
(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory(
      require("./interview-logic.js"),
      require("./radicals-knowledge.js")
    );
  } else {
    global.ProfzorDemo = factory(global.ProfzorLogic, global.ProfzorKnowledge);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (Logic, Knowledge) {
  "use strict";

  var GENERAL_TEXTS = [
    "Расскажите немного о себе",
    "Какой профессией можно описать ваш характер",
    "Какие три профессии вам нравятся",
    "Назовите три качества, которые вам нравятся в себе",
    "Назовите три качества, которые вам не нравятся в себе",
    "Расскажите, как вы общаетесь с людьми",
    "Расскажите о своей работе, ее сильных сторонах и о том, что вам лучше всего удается. С примерами",
    "Что вам нравится в том, что вы делаете",
    "Что вам в этом не нравится",
    "Расскажите о вашем хобби",
    "Расскажите о ваших родителях",
    "Что выводит вас из равновесия",
  ];

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function obs(id, text, extra) {
    var src = extra || {};
    return Logic.normalizeObservationFragment(
      {
        id: id,
        text: text,
        source: src.source || "free_note",
        questionId: src.questionId || null,
        declaredMotiveHint: Boolean(src.declaredMotiveHint),
        socialDesirability: src.socialDesirability || "none",
        createdAt: "2026-08-01T10:00:00.000Z",
      },
      src.radicalId,
      src.order || 0
    );
  }

  function hintResponse() {
    return {
      declaredMotives: [
        {
          text: "Хочет быть на виду и получать признание",
          quoteIds: ["obs_h1"],
        },
      ],
      radicalHypotheses: [
        {
          radicalId: "emotive",
          confidence: "medium",
          markers: ["не может отказать", "про другого человека"],
          quoteIds: ["obs_m1"],
        },
        {
          radicalId: "schizoid",
          confidence: "low",
          markers: ["тишина", "разобрать задачу"],
          quoteIds: ["obs_s1"],
        },
      ],
      trueMotiveHypothesis: {
        drivers: ["сохранить отношения", "избежать конфликта"],
        leadingRadicals: ["emotive"],
        tension: ["заявленное «быть замеченным» vs отказ отказать коллеге"],
        confidence: "low",
        summary:
          "Гипотеза: ведущий драйвер — не подвести другого, а не сцена. Требует проверки экспертом.",
      },
      contradictions: [
        {
          whatDeclared: "Важно, чтобы заметили на совещании",
          whatObserved: "Не может отказать коллеге, даже в ущерб сроку",
          whyItMatters: "Заявленное и поведение расходятся",
          probeQuestion: "Что будет, если откажете в просьбе?",
        },
      ],
      coverageGaps: ["paranoid", "anxious"],
      nextQuestions: [
        "Что будет, если коллега обидится на отказ?",
        "Когда вам спокойнее — в зале или наедине с задачей?",
      ],
      insufficientEvidence: false,
      disclaimer: "Демо-гипотеза, не диагноз. Требует подтверждения эксперта.",
    };
  }

  function buildInterview() {
    var ids = Logic.DEFAULT_RADICAL_IDS;
    var radicals = {};
    ids.forEach(function (id) {
      radicals[id] = Logic.emptyRadicalData();
    });

    radicals.hysteroid.observations = [
      obs("obs_h1", "Важно, чтобы меня заметили на совещании", {
        radicalId: "hysteroid",
        source: "general_question",
        questionId: "gq_self",
        declaredMotiveHint: true,
        socialDesirability: "suspected",
        order: 0,
      }),
    ];
    radicals.epileptoid.observations = [
      obs("obs_e1", "Сначала регламент, потом любые сюрпризы", {
        radicalId: "epileptoid",
        source: "check_question",
        questionId: "cq_epi_0",
        order: 0,
      }),
    ];
    radicals.schizoid.observations = [
      obs("obs_s1", "Люблю разобрать задачу в тишине, без созвонов", {
        radicalId: "schizoid",
        source: "free_note",
        order: 0,
      }),
    ];
    radicals.hyperthym.observations = [
      obs("obs_ht1", "Идей много, довести до конца получается реже", {
        radicalId: "hyperthym",
        source: "behavior",
        order: 0,
      }),
    ];
    radicals.emotive.observations = [
      obs("obs_m1", "Если коллеге тяжело — не могу отказать, даже когда горит срок", {
        radicalId: "emotive",
        source: "free_note",
        order: 0,
      }),
    ];

    var generalQuestions = GENERAL_TEXTS.map(function (text, i) {
      var id = i === 0 ? "gq_self" : i === 6 ? "gq_job" : "gq_" + i;
      var asked = i === 0 || i === 6 || i === 9;
      return Logic.normalizeProtocolQuestion(
        {
          id: id,
          text: text,
          asked: asked,
          askedAt: asked ? "2026-08-01T10:05:00.000Z" : null,
          answerId: i === 0 ? "obs_h1" : null,
        },
        i
      );
    });

    var checkQuestionsBank = Knowledge
      ? Knowledge.buildDefaultChecks()
      : [];
    var epiLinked = false;
    checkQuestionsBank = checkQuestionsBank.map(function (q, i) {
      var item = Logic.normalizeProtocolQuestion(q, i);
      if (!epiLinked && item.radicalId === "epileptoid") {
        item.id = "cq_epi_0";
        item.asked = true;
        item.askedAt = "2026-08-01T10:12:00.000Z";
        item.answerId = "obs_e1";
        epiLinked = true;
      }
      return item;
    });

    var rawNotes =
      "Важно, чтобы меня заметили на совещании\n" +
      "Сначала регламент, потом любые сюрпризы\n" +
      "Люблю разобрать задачу в тишине, без созвонов\n" +
      "Идей много, довести до конца получается реже\n" +
      "Если коллеге тяжело — не могу отказать, даже когда горит срок";

    var ai = Logic.mergeAiState(Logic.emptyAiState(), {
      status: "ready",
      updatedAt: "2026-08-01T10:20:00.000Z",
    });
    var hint = hintResponse();
    ai.radicalHypotheses = hint.radicalHypotheses;
    ai.declaredMotives = hint.declaredMotives;
    ai.trueMotiveHypothesis = hint.trueMotiveHypothesis;
    ai.contradictions = hint.contradictions;
    ai.nextQuestions = hint.nextQuestions;
    ai.disclaimer = hint.disclaimer;

    return {
      interviewId: "iv_demo",
      respondent: "Р-DEMO",
      date: todayISO(),
      goal: "Демонстрация рабочего места эксперта",
      rawNotes: rawNotes,
      lastTransferredLength: rawNotes.length,
      generalQuestions: generalQuestions,
      checkQuestionsBank: checkQuestionsBank,
      radicals: radicals,
      hierarchyOrder: ids.slice(),
      hierarchyManual: false,
      conclusionText: "",
      activeRadicalId: "hysteroid",
      ai: ai,
      motivation: {
        declared: hint.declaredMotives,
        hypothesized: hint.trueMotiveHypothesis,
        confirmed: null,
        tensions: hint.contradictions,
      },
      activeAsk: { kind: null, id: null },
      noteSourceMode: "answer",
      savedAt: "2026-08-01T10:20:00.000Z",
    };
  }

  return {
    buildInterview: buildInterview,
    hintResponse: hintResponse,
  };
});
