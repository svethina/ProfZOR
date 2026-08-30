/**
 * Кейсы: протокол интервью (шаг 1).
 *
 * 1. Старое { text } → source: free_note.
 * 2. Вопрос без ответа не считается покрытым.
 * 3. asked + answerId = покрыт.
 * 4. radicalsWithoutSupport — радикалы без наблюдений.
 * 5. mergeAiState не трогает radicalId.
 * 6. Пустой банк проверок сидится из базы знаний.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../interview-logic.js");
const Knowledge = require("../radicals-knowledge.js");

describe("Миграция наблюдений", () => {
  it("старый { text } получает source free_note", () => {
    const list = Logic.migrateObservationsList(
      [{ text: "цитата", radicalId: "hysteroid" }],
      "hysteroid"
    );
    expect(list).toHaveLength(1);
    expect(list[0].source).toBe("free_note");
    expect(list[0].text).toBe("цитата");
    expect(list[0].questionId).toBeNull();
  });

  it("строка целиком становится free_note", () => {
    const list = Logic.migrateObservationsList("старый текст", "emotive");
    expect(list[0].source).toBe("free_note");
    expect(list[0].radicalId).toBe("emotive");
  });
});

describe("Покрытие вопроса", () => {
  it("вопрос без ответа не покрыт, даже если asked", () => {
    const asked = Logic.normalizeProtocolQuestion(
      { id: "q1", text: "о себе", asked: true },
      0
    );
    expect(Logic.isQuestionCovered(asked)).toBe(false);
  });

  it("asked + answerId = покрыт", () => {
    const covered = Logic.linkAnswerToQuestion(
      [{ id: "q1", text: "о себе", asked: true }],
      "q1",
      "obs_1"
    );
    expect(Logic.isQuestionCovered(covered[0])).toBe(true);
    expect(covered[0].answerId).toBe("obs_1");
  });
});

describe("Опора радикалов", () => {
  it("без наблюдений — нет опоры", () => {
    const missing = Logic.radicalsWithoutSupport({
      hysteroid: { observations: [{ text: "есть" }] },
    });
    expect(missing).not.toContain("hysteroid");
    expect(missing).toContain("schizoid");
    expect(missing).toHaveLength(6);
  });
});

describe("Заключение по мотивации", () => {
  it("три разных текста: confirmed / только ИИ / пусто", () => {
    expect(
      Logic.motivationDraftLines({
        confirmed: { summary: "опора и проверка" },
        hypothesized: { summary: "модель думает иначе" },
      }).join("\n")
    ).toMatch(/подтверждено экспертом/);
    expect(
      Logic.motivationDraftLines({
        hypothesized: { summary: "скорее safety" },
      }).join("\n")
    ).toMatch(/не подтверждено/);
    expect(Logic.motivationDraftLines({})).toEqual([]);
  });
});

describe("Слой ИИ изолирован от radicalId", () => {
  it("mergeAiState не содержит radicalId эксперта", () => {
    const ai = Logic.mergeAiState(null, {
      status: "ready",
      radicalHypotheses: [{ radicalId: "anxious", confidence: "low" }],
    });
    expect(ai.status).toBe("ready");
    expect(ai.disclaimer).toMatch(/гипотеза/i);
    expect(ai).not.toHaveProperty("expertRadicalId");
  });
});

describe("База знаний", () => {
  it("даёт проверки на все 7 радикалов", () => {
    const checks = Knowledge.buildDefaultChecks(() => "id");
    const ids = new Set(checks.map((q) => q.radicalId));
    expect(ids.size).toBe(7);
    expect(checks.length).toBeGreaterThanOrEqual(35);
    checks.forEach((q) => {
      expect(q.asked).toBe(false);
      expect(q.answerId).toBeNull();
    });
  });
});
