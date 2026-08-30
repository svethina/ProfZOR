/**
 * Vercel Serverless: POST /api/ai
 * Ключ только из OPENROUTER_API_KEY. В браузер не отдаётся.
 */
var Client = require("../ai-client.js");

var OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
var DEFAULT_MODEL = "google/gemma-4-31b-it:free";

function publicError(status, message) {
  var err = new Error(message);
  err.status = status;
  return err;
}

function sanitizeKey(key) {
  return String(key || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function mapOpenRouterError(httpStatus, rawText) {
  var text = String(rawText || "").replace(/sk-or-v1-[a-zA-Z0-9]+/g, "");
  var msg = "";
  try {
    var parsed = JSON.parse(text);
    msg =
      (parsed.error && parsed.error.message) ||
      parsed.message ||
      parsed.error ||
      "";
    msg = String(msg);
  } catch (err) {
    msg = "";
  }
  if (httpStatus === 401) {
    return publicError(
      502,
      "Ключ OpenRouter отклонён. Проверьте OPENROUTER_API_KEY на Vercel."
    );
  }
  if (httpStatus === 402) {
    return publicError(502, "На OpenRouter нет кредитов.");
  }
  if (httpStatus === 429) {
    return publicError(502, "Лимит OpenRouter. Подождите минуту.");
  }
  if (httpStatus === 404 && /data policy|Free model/i.test(msg)) {
    return publicError(
      502,
      "Free-модель закрыта в OpenRouter → Settings → Privacy: включите Free model publication."
    );
  }
  if (msg) {
    return publicError(502, "OpenRouter: " + msg.slice(0, 180));
  }
  return publicError(502, "OpenRouter недоступен (" + httpStatus + ")");
}

function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length) {
    throw publicError(400, "Нет сообщений");
  }
  if (messages.length > 8) {
    throw publicError(400, "Слишком много сообщений");
  }
  return messages.map(function (m) {
    var role = m && m.role;
    if (role !== "system" && role !== "user" && role !== "assistant") {
      throw publicError(400, "Некорректное сообщение");
    }
    var content = String(m.content || "");
    if (content.length > 80000) {
      throw publicError(413, "Слишком большой пакет");
    }
    return { role: role, content: content };
  });
}

function runAiProxy(body, env, fetchFn) {
  var key = sanitizeKey(env && env.OPENROUTER_API_KEY);
  if (!key) {
    return Promise.reject(publicError(503, "Сервер без ключа OpenRouter"));
  }
  var messages = validateMessages(body && body.messages);
  var model = (env && env.OPENROUTER_MODEL) || DEFAULT_MODEL;
  var doFetch = fetchFn || fetch;
  var referer =
    env && env.VERCEL_PROJECT_PRODUCTION_URL
      ? "https://" + String(env.VERCEL_PROJECT_PRODUCTION_URL).replace(/^https?:\/\//, "")
      : env && env.VERCEL_URL
        ? "https://" + env.VERCEL_URL
        : "https://profzor.vercel.app";

  return doFetch(OPENROUTER_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-Title": "ProfZOR",
    },
    body: JSON.stringify({
      model: model,
      temperature: 0.2,
      max_tokens: 1500,
      messages: messages,
      provider: {
        data_collection: "allow",
        allow_fallbacks: true,
      },
    }),
  }).then(function (res) {
    if (!res.ok) {
      return res.text().then(function (raw) {
        throw mapOpenRouterError(res.status, raw);
      });
    }
    return res.json();
  }).then(function (payload) {
    var content =
      payload &&
      payload.choices &&
      payload.choices[0] &&
      payload.choices[0].message &&
      payload.choices[0].message.content;
    if (!content) {
      throw publicError(502, "Модель вернула пустой ответ");
    }
    try {
      return Client.normalizeModelJson(Client.extractJson(content));
    } catch (err) {
      throw publicError(502, "Модель вернула не JSON");
    }
  });
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return Promise.resolve(req.body);
  }
  if (typeof req.body === "string") {
    try {
      return Promise.resolve(JSON.parse(req.body || "{}"));
    } catch (err) {
      return Promise.reject(publicError(400, "Некорректный JSON"));
    }
  }
  return new Promise(function (resolve, reject) {
    var chunks = [];
    req.on("data", function (c) {
      chunks.push(c);
    });
    req.on("end", function () {
      var raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (err) {
        reject(publicError(400, "Некорректный JSON"));
      }
    });
    req.on("error", function () {
      reject(publicError(400, "Некорректный запрос"));
    });
  });
}

async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Метод не поддерживается" });
    return;
  }
  try {
    var body = await readJsonBody(req);
    var parsed = await runAiProxy(body, process.env, fetch);
    res.status(200).json(parsed);
  } catch (err) {
    var status = err && err.status ? err.status : 502;
    var message =
      err && err.status
        ? err.message
        : "Ошибка модели";
    res.status(status).json({ error: message });
  }
}

handler.config = { maxDuration: 30 };
module.exports = handler;
module.exports.runAiProxy = runAiProxy;
