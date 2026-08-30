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

  var DEFAULT_URL = "/api/ai";
  var DEFAULT_MODEL = "openrouter";

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

  function requestHint(messages, fetchFn) {
    var doFetch = fetchFn || fetch;
    var ctrl = typeof AbortController === "function" ? new AbortController() : null;
    var timer =
      ctrl &&
      setTimeout(function () {
        ctrl.abort();
      }, 28000);
    return doFetch("/api/ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: messages }),
      signal: ctrl ? ctrl.signal : undefined,
    })
      .then(function (res) {
        if (timer) clearTimeout(timer);
        return res.json().then(
          function (body) {
            if (!res.ok) {
              throw new Error(
                (body && body.error) ||
                  (res.status === 404
                    ? "Нет /api/ai на сервере. Нужен новый деплой."
                    : "API " + res.status)
              );
            }
            return normalizeModelJson(body);
          },
          function () {
            if (res.status === 404) {
              throw new Error("Нет /api/ai на сервере. Нужен новый деплой.");
            }
            throw new Error("API " + res.status);
          }
        );
      })
      .catch(function (err) {
        if (timer) clearTimeout(timer);
        if (err && err.name === "AbortError") {
          throw new Error("Таймаут запроса к ИИ");
        }
        var msg = err && err.message ? String(err.message) : "";
        if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
          throw new Error(
            "Нет связи с /api/ai. Откройте сайт на Vercel, не файл с диска."
          );
        }
        throw err;
      });
  }

  function chatCompletions(settings, messages, fetchFn) {
    return requestHint(messages, fetchFn);
  }

  return {
    DEFAULT_URL: DEFAULT_URL,
    DEFAULT_MODEL: DEFAULT_MODEL,
    extractJson: extractJson,
    normalizeModelJson: normalizeModelJson,
    applyModelJsonToAi: applyModelJsonToAi,
    requestHint: requestHint,
    chatCompletions: chatCompletions,
  };
});
