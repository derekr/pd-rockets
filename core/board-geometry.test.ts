import { expect, test } from "bun:test";
import { cellFromPoint, gridIndex, insertOrder, parseGridTemplate, placementRules, rowCenter } from "./board-geometry";

test("grid tracks select rows within variable heights, half-gaps and empty lanes", () => {
  expect(parseGridTemplate("52px 80px 40px")).toEqual([52, 80, 40]);
  expect(parseGridTemplate("")).toEqual([]);
  expect(gridIndex(57, [52, 80], 12)).toBe(0);
  expect(gridIndex(60, [52, 80], 12)).toBe(1);
  expect(gridIndex(500, [52, 80], 12)).toBe(2);
  expect(rowCenter([52, 80], 12, 1)).toBe(104);
  expect(rowCenter([52, 80], 12, 2)).toBe(196);
  const lanes = [
    { rect: { left: 0, right: 100, top: 10 }, tracks: { rows: [52, 80], gap: 12 } },
    { rect: { left: 110, right: 210, top: 20 }, tracks: { rows: [], gap: 10 } },
  ];
  expect(cellFromPoint(lanes, 105, 30)).toEqual({ lane: 0, row: 0 });
  expect(cellFromPoint(lanes, 160, 200)).toEqual({ lane: 1, row: 0 });
  expect(cellFromPoint([], 0, 0)).toBeNull();
});

test("same-lane and cross-lane inserts preserve every card without mutating the source", () => {
  const lanes = [
    { col: 0, ids: ["a", "b", "c"] },
    { col: 1, ids: ["d"] },
    { col: 2, ids: [] },
  ];
  expect(insertOrder(lanes, "a", 0, 2)[0]?.ids).toEqual(["b", "c", "a"]);
  expect(insertOrder(lanes, "b", 1, 7)).toEqual([
    { col: 0, ids: ["a", "c"] },
    { col: 1, ids: ["d", "b"] },
    { col: 2, ids: [] },
  ]);
  expect(lanes[0]?.ids).toEqual(["a", "b", "c"]);
  for (const col of [0, 1, 2, 9]) {
    for (const row of [0, 1, 2, 7]) {
      for (const id of ["a", "b", "c", "d", "e"]) {
        const result = insertOrder(lanes, id, col, row);
        const ids = result.flatMap((lane) => lane.ids);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids.slice().sort()).toEqual(id === "e" ? ["a", "b", "c", "d", "e"] : ["a", "b", "c", "d"]);
        for (const lane of result) {
          const rules = placementRules([lane]);
          expect([...rules.matchAll(/grid-row:(\d+)/g)].map((match) => Number(match[1]))).toEqual(
            lane.ids.map((_, index) => index + 1),
          );
        }
      }
    }
  }
});

test("placement rules exclude a preview and quote opaque ids as CSS values", () => {
  expect(placementRules([{ col: 0, ids: ["a", "b"] }], "a")).toBe('[data-board-card="b"]{grid-row:2}');
  expect(placementRules([{ col: 0, ids: ['a"]{color:red}', "b"] }])).toBe(
    '[data-board-card="a\\22 ]{color:red}"]{grid-row:1}[data-board-card="b"]{grid-row:2}',
  );
  expect(placementRules([{ col: 0, ids: ["a"] }], undefined, "#board-one")).toBe(
    '#board-one [data-board-card="a"]{grid-row:1}',
  );
});
