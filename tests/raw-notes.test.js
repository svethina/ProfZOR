/**
 * Кейсы: сырые заметки и перенос дельты между кликами по радикалу.
 *
 * 1. После успешного переноса rawText не очищается и не обрезается.
 * 2. В наблюдение уходит только хвост после lastTransferredLength, не весь текст.
 * 3. Пустой хвост / одни пробелы → assigned=false, цитату не создавать.
 * 4. Если указатель больше длины текста (пользователь стёр часть) —
 *    clamp без падения, удалённое не восстанавливать.
 * 5. Цепочка кликов: А → радикал1, дописать Б → радикал2 только Б, и т.д.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../interview-logic.js");

describe("Сырые заметки / дельта между кликами", () => {
  it("не очищает сырой текст при успешном переносе", () => {
    const raw = "фраза А";
    const result = Logic.applyTransferDelta(raw, 0, "hysteroid");
    expect(result.assigned).toBe(true);
    expect(result.rawText).toBe(raw);
    expect(result.rawText).toBe("фраза А");
  });

  it("переносит только фрагмент после указателя, не весь текст", () => {
    const raw = "фраза А фраза Б";
    const afterA = "фраза А".length;
    const result = Logic.applyTransferDelta(raw, afterA, "schizoid");
    expect(result.assigned).toBe(true);
    expect(result.observation.text).toBe("фраза Б");
    expect(result.observation.text).not.toContain("фраза А");
    expect(result.rawText).toBe(raw);
  });

  it("не создаёт цитату при пустом хвосте", () => {
    const raw = "уже перенесено";
    const result = Logic.applyTransferDelta(raw, raw.length, "emotive");
    expect(result.assigned).toBe(false);
    expect(result.observation).toBeNull();
    expect(result.rawText).toBe(raw);
  });

  it("не создаёт цитату, если хвост — только пробелы", () => {
    const raw = "текст   ";
    const result = Logic.applyTransferDelta(raw, "текст".length, "anxious");
    expect(result.assigned).toBe(false);
    expect(result.observation).toBeNull();
    expect(result.rawText).toBe(raw);
  });

  it("clamp: указатель больше длины — без падения, текст не восстанавливается", () => {
    const raw = "коротко";
    expect(Logic.clampTransferredLength(raw, 999)).toBe(raw.length);
    const result = Logic.applyTransferDelta(raw, 999, "paranoid");
    expect(result.assigned).toBe(false);
    expect(result.rawText).toBe("коротко");
    expect(result.rawText.length).toBe(raw.length);
    expect(result.lastTransferredLength).toBe(raw.length);
  });

  it("цепочка кликов: А, затем только Б, затем только В", () => {
    let raw = "фраза А";
    let pointer = 0;

    const r1 = Logic.applyTransferDelta(raw, pointer, "hysteroid");
    expect(r1.observation.text).toBe("фраза А");
    pointer = r1.lastTransferredLength;
    expect(raw).toBe("фраза А");

    raw = "фраза А фраза Б";
    const r2 = Logic.applyTransferDelta(raw, pointer, "epileptoid");
    expect(r2.observation.text).toBe("фраза Б");
    pointer = r2.lastTransferredLength;

    raw = "фраза А фраза Б фраза В";
    const r3 = Logic.applyTransferDelta(raw, pointer, "hyperthym");
    expect(r3.observation.text).toBe("фраза В");
    expect(r3.rawText).toBe("фраза А фраза Б фраза В");
  });

  it("extractDeltaSinceTransfer trim-ит края фрагмента", () => {
    expect(Logic.extractDeltaSinceTransfer("abc  def  ", 3)).toBe("def");
    expect(Logic.extractDeltaSinceTransfer("abc", 3)).toBeNull();
  });
});
