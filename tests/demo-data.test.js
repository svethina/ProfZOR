/**
 * Демо-пакет: вымышленный Р-DEMO, без confirmed, без живого API.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Demo = require("../demo-data.js");
const Logic = require("../interview-logic.js");
const demoHtml = readFileSync(new URL("../demo.html", import.meta.url), "utf8");

describe("Демоверсия", () => {
  it("собирает интервью с наблюдениями и без подтверждённой мотивации", () => {
    const iv = Demo.buildInterview();
    expect(iv.respondent).toBe("Р-DEMO");
    expect(iv.radicals.hysteroid.observations[0].text).toMatch(/совещании/);
    expect(iv.radicals.emotive.observations.length).toBeGreaterThan(0);
    expect(iv.motivation.confirmed).toBeNull();
    expect(iv.conclusionText).toBe("");
    expect(iv.ai.radicalHypotheses.length).toBeLessThanOrEqual(3);
    expect(Logic.isQuestionCovered(iv.generalQuestions[0])).toBe(true);
  });

  it("подсказка ИИ не ставит диагноз и не назначает radicalId эксперта", () => {
    const hint = Demo.hintResponse();
    expect(hint.disclaimer).toMatch(/не диагноз/i);
    expect(hint).not.toHaveProperty("radicalId");
    expect(hint.radicalHypotheses[0].radicalId).toBe("emotive");
  });

  it("demo.html — полное приложение с флагом демо, без редиректа-заглушки", () => {
    expect(demoHtml).toMatch(/window\.PROFZOR_DEMO\s*=\s*true/);
    expect(demoHtml).toMatch(/id="respondent"/);
    expect(demoHtml).toMatch(/src="app\.js/);
    expect(demoHtml).not.toMatch(/location\.(replace|href)\s*=/);
    expect(demoHtml.length).toBeGreaterThan(4000);
  });
});
