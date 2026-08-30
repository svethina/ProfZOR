/**
 * Вызов API (OpenAI-совместимый Chat Completions). Таймаут, разбор JSON, ошибки.
 * Ключ не хранится в репозитории.
 */
(function (global, factory) {
  if (typeof exports === "object" && typeof module !== "undefined") {
    module.exports = factory();
  } else {
    global.ProfzorAiClient = factory();
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var DEFAULT_URL = "https://api.openai.com/v1/chat/completions";
  var DEFAULT_MODEL = "gpt-4o-mini";

  function extractJson(text) {
    var raw = String(text || "").trim();
    var fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) raw = fence[1].trim();
    var start = raw.indexOf("{");
    var end = raw.lastIndexOf("}");
    if (start < 0 || end <= start) {
      throw new Error("В ответе модели нет JSON");
    }
    return JSON.parse(raw.slice(start, end + 1));
  }

  function normalizeModelJson(data) {
    var src = data && typeof data === "object" ? data : {};
    var hyps = Array.isArray(src.radicalHypotheses)
      ? src.radicalHypotheses.slice(0, 3)
      : [];
    return {
      declaredMotives: Array.isArray(src.declaredMotives)
        ? src.declaredMotives
        : [],
      radicalHypotheses: hyps,
      trueMotiveHypothesis: src.trueMotiveHypothesis || null,
      contradictions: Array.isArray(src.contradictions)
        ? src.contradictions
        : [],
      coverageGaps: Array.isArray(src.coverageGaps) ? src.coverageGaps : [],
      nextQuestions: Array.isArray(src.nextQuestions) ? src.nextQuestions : [],
      insufficientEvidence: Boolean(src.insufficientEvidence),
      disclaimer:
        src.disclaimer || "Гипотеза, не диагноз. Требует подтверждения эксперта.",
    };
  }

  function applyModelJsonToAi(parsed) {
    var n = normalizeModelJson(parsed);
    return {
      status: "ready",
      updatedAt: new Date().toISOString(),
      radicalHypotheses: n.radicalHypotheses,
      declaredMotives: n.declaredMotives,
      trueMotiveHypothesis: n.trueMotiveHypothesis,
      contradictions: n.contradictions,
      coverageGaps: n.coverageGaps,
      nextQuestions: n.nextQuestions,
      disclaimer: n.disclaimer,
      insufficientEvidence: n.insufficientEvidence,
    };
  }

  function chatCompletions(settings, messages, fetchFn) {
    var url = (settings && settings.url) || DEFAULT_URL;
    var model = (settings && settings.model) || DEFAULT_MODEL;
    var key = settings && settings.apiKey;
    var doFetch = fetchFn || fetch;
    if (!key) {
      return Promise.reject(new Error("Нет ключа API"));
    }
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer =
      ctrl &&
      setTimeout(function () {
        ctrl.abort();
      }, 25000);
    return doFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + key,
      },
      body: JSON.stringify({
        model: model,
        temperature: 0.2,
        messages: messages,
        response_format: { type: "json_object" },
      }),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        if (!res.ok) {
          return res.text().then(function (t) {
            throw new Error("API " + res.status + (t ? ": " + t.slice(0, 180) : ""));
          });
        }
        return res.json();
      })
      .then(function (body) {
        var content =
          body &&
          body.choices &&
          body.choices[0] &&
          body.choices[0].message &&
          body.choices[0].message.content;
        return normalizeModelJson(extractJson(content));
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        throw err;
      });
  }

  return {
    DEFAULT_URL: DEFAULT_URL,
    DEFAULT_MODEL: DEFAULT_MODEL,
    extractJson: extractJson,
    normalizeModelJson: normalizeModelJson,
    applyModelJsonToAi: applyModelJsonToAi,
    chatCompletions: chatCompletions,
  };
});
