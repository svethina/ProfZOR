/**
 * Кейсы: карточка профиля / сводная таблица (логика модели, не DOM-рендер кнопок).
 *
 * 1. В разметке профиля нет столбца «Выраженность» и блока «Предварительная иерархия».
 * 2. В модели таблицы всегда все 7 радикалов, в т.ч. с 0 наблюдений.
 * 3. Сортировка: больше наблюдений выше; при равенстве — исходный порядок RADICALS.
 * 4. В ячейке — только наблюдения этого радикала (номера + текст).
 * 5. Выраженность не подставляется вместо наблюдений в модели строк.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Logic = require("../interview-logic.js");
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const IDS = Logic.DEFAULT_RADICAL_IDS;

function emptyMap() {
  const map = {};
  IDS.forEach((id) => {
    map[id] = Logic.emptyRadicalData();
  });
  return map;
}

describe("Профиль / сводная таблица — разметка", () => {
  it("в index.html нет столбца Выраженность и блока предварительной иерархии", () => {
    const html = fs.readFileSync(
      path.join(__dirname, "..", "index.html"),
      "utf8"
    );
    const profileStart = html.indexOf('id="panel-profile"');
    expect(profileStart).toBeGreaterThan(-1);
    const profileHtml = html.slice(profileStart);

    expect(profileHtml).not.toMatch(/<th[^>]*>\s*Выраженность\s*<\/th>/);
    expect(profileHtml).not.toContain("Предварительная иерархия профиля");
    expect(profileHtml).not.toContain("btn-reset-hierarchy");
    expect(profileHtml).not.toContain('id="hierarchy-list"');
    expect(profileHtml).toContain("Сводная таблица");
    expect(profileHtml).toContain("Наблюдения");
  });
});

describe("Профиль / сводная таблица — модель и сортировка", () => {
  it("включает все 7 радикалов даже при нуле наблюдений", () => {
    const rows = Logic.buildSummaryRows(emptyMap(), IDS);
    expect(rows).toHaveLength(7);
    expect(rows.every((r) => r.observationCount === 0)).toBe(true);
    expect(rows.map((r) => r.radicalId)).toEqual(IDS);
    expect(rows.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("сортирует по убыванию числа наблюдений", () => {
    const map = emptyMap();
    map.schizoid.observations = [
      { order: 1, text: "a", radicalId: "schizoid" },
      { order: 2, text: "b", radicalId: "schizoid" },
      { order: 3, text: "c", radicalId: "schizoid" },
    ];
    map.emotive.observations = [
      { order: 1, text: "e1", radicalId: "emotive" },
    ];

    const rows = Logic.buildSummaryRows(map, IDS);
    expect(rows[0].radicalId).toBe("schizoid");
    expect(rows[0].observationCount).toBe(3);
    expect(rows[1].radicalId).toBe("emotive");
    expect(rows[1].observationCount).toBe(1);
    expect(rows).toHaveLength(7);
  });

  it("при равенстве числа наблюдений сохраняет исходный порядок радикалов", () => {
    const map = emptyMap();
    map.hysteroid.observations = [
      { order: 1, text: "h", radicalId: "hysteroid" },
    ];
    map.epileptoid.observations = [
      { order: 1, text: "e", radicalId: "epileptoid" },
    ];

    const rows = Logic.buildSummaryRows(map, IDS);
    const topTwo = rows.filter((r) => r.observationCount === 1);
    expect(topTwo.map((r) => r.radicalId)).toEqual([
      "hysteroid",
      "epileptoid",
    ]);
  });

  it("в ячейке только наблюдения своего радикала с номерами", () => {
    const map = emptyMap();
    map.paranoid.observations = [
      { order: 1, text: "цель", radicalId: "paranoid" },
      { order: 2, text: "настойчивость", radicalId: "paranoid" },
    ];
    map.hyperthym.observations = [
      { order: 1, text: "темп", radicalId: "hyperthym" },
    ];

    const rows = Logic.buildSummaryRows(map, IDS);
    const paranoid = rows.find((r) => r.radicalId === "paranoid");
    const hyperthym = rows.find((r) => r.radicalId === "hyperthym");

    expect(paranoid.observations).toEqual([
      { number: 1, text: "цель", radicalId: "paranoid" },
      { number: 2, text: "настойчивость", radicalId: "paranoid" },
    ]);
    expect(hyperthym.observations).toEqual([
      { number: 1, text: "темп", radicalId: "hyperthym" },
    ]);
    expect(
      paranoid.observations.every((o) => o.radicalId === "paranoid")
    ).toBe(true);
  });

  it("модель строки не содержит поля выраженности вместо наблюдений", () => {
    const map = emptyMap();
    map.anxious.observations = [
      { order: 1, text: "тревога", radicalId: "anxious" },
    ];
    map.anxious.intensity = "strong";

    const row = Logic.buildSummaryRows(map, IDS).find(
      (r) => r.radicalId === "anxious"
    );
    expect(row).not.toHaveProperty("intensity");
    expect(row.observations[0].text).toBe("тревога");
    expect(row.observations[0].text).not.toMatch(/выражен|сильный|strong/i);
  });
});
