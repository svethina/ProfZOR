/**
 * Кейсы: наблюдения и цитаты.
 *
 * 1. Каждая цитата получает порядковый номер 1..n после reindex.
 * 2. radicalId назначается кликом (передаётся в applyTransferDelta / append).
 * 3. Несколько переносов в один радикал нумеруются подряд.
 * 4. Разные радикалы хранят свои списки независимо.
 */
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../interview-logic.js");

describe("Наблюдения и нумерация", () => {
  it("назначает radicalId из клика при переносе", () => {
    const result = Logic.applyTransferDelta("цитата", 0, "schizoid");
    expect(result.assigned).toBe(true);
    expect(result.observation.radicalId).toBe("schizoid");
  });

  it("нумерует цитаты по порядку в списке радикала", () => {
    let list = [];
    list = Logic.appendObservation(list, {
      text: "первая",
      radicalId: "emotive",
    });
    list = Logic.appendObservation(list, {
      text: "вторая",
      radicalId: "emotive",
    });
    list = Logic.appendObservation(list, {
      text: "третья",
      radicalId: "emotive",
    });

    const numbered = Logic.numberedObservations(list);
    expect(numbered).toEqual([
      { number: 1, text: "первая", radicalId: "emotive" },
      { number: 2, text: "вторая", radicalId: "emotive" },
      { number: 3, text: "третья", radicalId: "emotive" },
    ]);
    expect(list.map((x) => x.order)).toEqual([1, 2, 3]);
  });

  it("сохраняет radicalId у каждой записи при append", () => {
    const list = Logic.appendObservation([], {
      text: "заметка",
      radicalId: "paranoid",
    });
    expect(list[0].radicalId).toBe("paranoid");
    expect(list[0].order).toBe(1);
  });

  it("изолирует наблюдения разных радикалов", () => {
    const map = {
      hysteroid: Logic.emptyRadicalData(),
      schizoid: Logic.emptyRadicalData(),
    };
    map.hysteroid.observations = Logic.appendObservation([], {
      text: "для истероида",
      radicalId: "hysteroid",
    });
    map.schizoid.observations = Logic.appendObservation([], {
      text: "для шизоида",
      radicalId: "schizoid",
    });

    expect(Logic.numberedObservations(map.hysteroid.observations)[0].text).toBe(
      "для истероида"
    );
    expect(Logic.numberedObservations(map.schizoid.observations)[0].text).toBe(
      "для шизоида"
    );
    expect(map.hysteroid.observations).toHaveLength(1);
    expect(map.schizoid.observations).toHaveLength(1);
  });
});
