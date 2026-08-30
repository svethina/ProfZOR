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
      { OPENROUTER_API_KEY: "test-secret-key" },
      fetchFn
    );
    expect(calls[0].url).toContain("openrouter.ai");
    expect(calls[0].opts.headers.Authorization).toBe("Bearer test-secret-key");
    expect(JSON.stringify(parsed)).not.toMatch(/test-secret-key/);
    expect(parsed.radicalHypotheses[0].radicalId).toBe("schizoid");
  });
});
