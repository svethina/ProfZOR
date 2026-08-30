/**
 * Серверный прокси OpenRouter: ключ не уходит в ответ.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { runAiProxy } = require("../api/ai.js");

describe("POST /api/ai", () => {
  it("без OPENROUTER_API_KEY не вызывает модель", async () => {
    await expect(
      runAiProxy(
        { messages: [{ role: "user", content: "x" }] },
        {},
        () => Promise.reject(new Error("fetch не должен вызываться"))
      )
    ).rejects.toMatchObject({ status: 503 });
  });

  it("зовёт OpenRouter с ключом из env и возвращает JSON без секрета", async () => {
    const calls = [];
    const fetchFn = (url, opts) => {
      calls.push({ url, opts });
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              {
                message: {
                  content:
                    '{"radicalHypotheses":[{"radicalId":"schizoid","confidence":"low"}],"insufficientEvidence":true}',
                },
              },
            ],
          }),
      });
    };
    const parsed = await runAiProxy(
      { messages: [{ role: "user", content: "протокол" }] },
      { OPENROUTER_API_KEY: '  "test-secret-key"  ' },
      fetchFn
    );
    expect(calls[0].url).toContain("openrouter.ai");
    expect(calls[0].opts.headers.Authorization).toBe("Bearer test-secret-key");
    expect(calls[0].opts.headers["User-Agent"]).toBe("ProfZOR/1.0");
    expect(JSON.stringify(parsed)).not.toMatch(/test-secret-key/);
    expect(parsed.radicalHypotheses[0].radicalId).toBe("schizoid");
    const sent = JSON.parse(calls[0].opts.body);
    expect(sent.model).toBe("google/gemma-4-31b-it:free");
    expect(sent.provider).toBeUndefined();
    expect(sent.max_tokens).toBeUndefined();
  });

  it("401 ключа — понятная ошибка без секрета", async () => {
    await expect(
      runAiProxy(
        { messages: [{ role: "user", content: "x" }] },
        { OPENROUTER_API_KEY: "test-secret-key" },
        () =>
          Promise.resolve({
            ok: false,
            status: 401,
            text: () =>
              Promise.resolve(
                '{"error":{"message":"User not found. key=test-secret-key"}}'
              ),
          })
      )
    ).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("Ключ OpenRouter отклонён"),
    });
  });

  it("404 политики free-модели — подсказка про Privacy", async () => {
    await expect(
      runAiProxy(
        { messages: [{ role: "user", content: "x" }] },
        { OPENROUTER_API_KEY: "test-secret-key" },
        () =>
          Promise.resolve({
            ok: false,
            status: 404,
            text: () =>
              Promise.resolve(
                '{"error":{"message":"No endpoints found matching your data policy (Free model publication)"}}'
              ),
          })
      )
    ).rejects.toMatchObject({
      status: 502,
      message: expect.stringContaining("Free model publication"),
    });
  });

  it("вторая free-модель, если первая недоступна", async () => {
    const calls = [];
    const fetchFn = (_url, opts) => {
      calls.push(JSON.parse(opts.body).model);
      if (calls.length === 1) {
        return Promise.resolve({
          ok: false,
          status: 404,
          text: () => Promise.resolve('{"error":{"message":"No endpoints found"}}'),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            choices: [
              { message: { content: '{"insufficientEvidence":true}' } },
            ],
          }),
      });
    };
    const parsed = await runAiProxy(
      { messages: [{ role: "user", content: "x" }] },
      { OPENROUTER_API_KEY: "test-secret-key" },
      fetchFn
    );
    expect(calls).toEqual([
      "google/gemma-4-31b-it:free",
      "google/gemma-4-26b-a4b-it:free",
    ]);
    expect(parsed.insufficientEvidence).toBe(true);
  });
});
