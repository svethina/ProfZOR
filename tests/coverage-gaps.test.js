/**
 * Дыры coverage в interview-logic.js (ветки/края):
 *
 * Заметки:
 * - rawText null/undefined → ""
 * - pointer не число / NaN → 0
 * - pointer < 0 → 0
 * - pointer ровно внутри длины → без clamp вниз/вверх
 *
 * Наблюдения:
 * - obsCount(null) / без observations → 0
 * - sortByOrder(null) и пункты без order
 * - appendObservation: list null, пустой text, без radicalId/id, явный index
 * - numberedObservations: null, пустые тексты отфильтровать, radicalId null
 *
 * Сводная:
 * - sort/build без radicalIds → DEFAULT_RADICAL_IDS
 * - radicalsMap null / отсутствующий ключ радикала → emptyRadicalData
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../interview-logic.js");

describe("Coverage gaps — заметки", () => {
  it("clamp: null/undefined текст и нечисловой/отрицательный указатель", () => {
    expect(Logic.clampTransferredLength(null, 5)).toBe(0);
    expect(Logic.clampTransferredLength(undefined, 5)).toBe(0);
    expect(Logic.clampTransferredLength("abc", "x")).toBe(0);
    expect(Logic.clampTransferredLength("abc", NaN)).toBe(0);
    expect(Logic.clampTransferredLength("abc", -3)).toBe(0);
    expect(Logic.clampTransferredLength("abc", 1)).toBe(1);
  });

  it("extract/apply: пустой/null raw не падает", () => {
    expect(Logic.extractDeltaSinceTransfer(null, 0)).toBeNull();
    expect(Logic.extractDeltaSinceTransfer(undefined, 0)).toBeNull();
    const r = Logic.applyTransferDelta(null, 0, "hysteroid");
    expect(r.assigned).toBe(false);
    expect(r.rawText).toBe("");
    expect(r.lastTransferredLength).toBe(0);
  });
});

describe("Coverage gaps — наблюдения", () => {
  it("obsCount для пустых/битых данных", () => {
    expect(Logic.obsCount(null)).toBe(0);
    expect(Logic.obsCount(undefined)).toBe(0);
    expect(Logic.obsCount({})).toBe(0);
    expect(Logic.obsCount({ observations: null })).toBe(0);
  });

  it("sortByOrder: null-список и отсутствующий order", () => {
    expect(Logic.sortByOrder(null)).toEqual([]);
    const sorted = Logic.sortByOrder([
      { text: "b", order: 2 },
      { text: "a" },
      { text: "c", order: 1 },
    ]);
    expect(sorted.map((x) => x.text)).toEqual(["a", "c", "b"]);
  });

  it("appendObservation: дефолты id/text/radicalId/order и null-list", () => {
    const withIndex = Logic.appendObservation(null, {}, 7);
    expect(withIndex).toHaveLength(1);
    expect(withIndex[0].id).toBe("obs_7");
    expect(withIndex[0].text).toBe("");
    expect(withIndex[0].radicalId).toBeNull();
    expect(withIndex[0].order).toBe(1);
    expect(withIndex[0].createdAt).toBeNull();

    const withId = Logic.appendObservation([], {
      id: "custom",
      text: "t",
      radicalId: "emotive",
      order: 9,
      createdAt: "2026-01-01",
    });
    expect(withId[0].id).toBe("custom");
    expect(withId[0].order).toBe(1);
    expect(withId[0].createdAt).toBe("2026-01-01");
  });

  it("numberedObservations: null, пустые строки, radicalId null", () => {
    expect(Logic.numberedObservations(null)).toEqual([]);
    expect(
      Logic.numberedObservations([
        { text: "  ", order: 1, radicalId: "x" },
        { text: "ok", order: 2 },
        { order: 3 },
      ])
    ).toEqual([{ number: 1, text: "ok", radicalId: null }]);
  });
});

describe("Coverage gaps — сводная таблица", () => {
  it("sortOrderByObservationCount без ids и с null map", () => {
    const order = Logic.sortOrderByObservationCount(null);
    expect(order).toEqual(Logic.DEFAULT_RADICAL_IDS);

    const orderEmptyIds = Logic.sortOrderByObservationCount(
      { hysteroid: { observations: [{ text: "a" }] } },
      []
    );
    expect(orderEmptyIds[0]).toBe("hysteroid");
    expect(orderEmptyIds).toHaveLength(7);
  });

  it("buildSummaryRows без ids и для отсутствующего радикала в map", () => {
    const rowsDefault = Logic.buildSummaryRows(null);
    expect(rowsDefault).toHaveLength(7);
    expect(rowsDefault.every((r) => r.observationCount === 0)).toBe(true);

    const rowsPartial = Logic.buildSummaryRows({
      schizoid: {
        observations: [{ order: 1, text: "s", radicalId: "schizoid" }],
      },
    });
    expect(rowsPartial[0].radicalId).toBe("schizoid");
    const missing = rowsPartial.find((r) => r.radicalId === "anxious");
    expect(missing.observations).toEqual([]);
    expect(missing.observationCount).toBe(0);
  });
});
