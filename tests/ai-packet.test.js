/**
 * Пакет ИИ и изоляция от radicalId эксперта.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../interview-logic.js");
const Packet = require("../ai-packet.js");
const Prompts = require("../ai-prompts.js");
const Client = require("../ai-client.js");
const Knowledge = require("../radicals-knowledge.js");

function sampleInterview() {
  return {
    respondent: "Иванов Иван",
    date: "2026-08-30",
    generalQuestions: [
      { id: "g1", text: "о себе", asked: true, answerId: "o1" },
      { id: "g2", text: "работа", asked: true },
    ],
    checkQuestionsBank: [
      { id: "c1", text: "проверка", radicalId: "hysteroid", asked: false },
    ],
    radicals: {
      hysteroid: {
        observations: [
          {
            id: "o1",
            text: "ждёт реакции",
            radicalId: "hysteroid",
            source: "general_question",
            questionId: "g1",
          },
        ],
      },
    },
    motivation: {
      confirmed: { summary: "нельзя слать как истину" },
    },
    rawNotes: "секретный черновик",
  };
}

describe("Пакет ИИ", () => {
  it("собирает вопросы, ответы, назначения и пустые зоны", () => {
    const packet = Packet.buildPacket(sampleInterview());
    expect(packet.purpose).toBe("profzor-ai-packet");
    expect(packet.respondentCode).toBe("И…");
    expect(packet.fragments[0].radicalId).toBe("hysteroid");
    expect(packet.fragments[0].source).toBe("general_question");
    expect(packet.generalQuestions[0].covered).toBe(true);
    expect(packet.emptyZones.questionsAskedWithoutAnswer[0].id).toBe("g2");
    expect(packet.emptyZones.radicalsWithoutSupport).toContain("schizoid");
    expect(packet).not.toHaveProperty("rawNotes");
    expect(JSON.stringify(packet)).not.toMatch(/нельзя слать как истину/);
  });

  it("парсится как JSON и не содержит confirmed прошлого захода", () => {
    const text = Packet.packetToText(Packet.buildPacket(sampleInterview()));
    const parsed = Packet.parsePacket(text);
    expect(parsed.fragments).toHaveLength(1);
    expect(parsed.motivation).toBeUndefined();
  });
});

describe("Промпт", () => {
  it("собирает system+user без ключа", () => {
    const payload = Prompts.buildCopyPayload(
      Packet.buildPacket(sampleInterview()),
      Knowledge
    );
    expect(payload.system).toMatch(/диагноз/i);
    expect(payload.user).toMatch(/profzor-ai-packet/);
    expect(payload.schema).toHaveProperty("insufficientEvidence");
  });
});

describe("Клиент: JSON не затирает radicalId", () => {
  it("extractJson и normalize не пишут expert radicalId", () => {
    const parsed = Client.normalizeModelJson(
      Client.extractJson(
        '```json\n{"radicalHypotheses":[{"radicalId":"anxious","confidence":"low"}],"insufficientEvidence":true}\n```'
      )
    );
    expect(parsed.radicalHypotheses[0].radicalId).toBe("anxious");
    expect(parsed.insufficientEvidence).toBe(true);
    const ai = Client.applyModelJsonToAi(parsed);
    expect(ai.status).toBe("ready");
    expect(ai).not.toHaveProperty("expertRadicalId");
  });

  it("лишние поля модели с radicalId эксперта не обязательны", () => {
    const n = Client.normalizeModelJson({
      radicalId: "hysteroid",
      radicalHypotheses: [{ radicalId: "emotive", quoteIds: ["o1"] }],
    });
    expect(n.radicalHypotheses[0].radicalId).toBe("emotive");
    expect(n).not.toHaveProperty("radicalId");
  });
});

describe("Покрытие вопроса в пакете", () => {
  it("asked без answerId не covered", () => {
    const q = Logic.normalizeProtocolQuestion(
      { id: "x", text: "q", asked: true },
      0
    );
    expect(Logic.isQuestionCovered(q)).toBe(false);
  });
});
