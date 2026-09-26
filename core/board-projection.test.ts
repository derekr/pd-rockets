import { expect, test } from "bun:test";
import { projectBoardMoves } from "./board-projection";

test("cross-lane holds renumber both lanes without affecting untouched lanes or the input", () => {
  const lanes = [
    { col: 0, ids: ["a", "b", "c"] },
    { col: 1, ids: ["d", "e"] },
    { col: 2, ids: ["f"] },
  ];
  const result = projectBoardMoves(lanes, [{ cardId: "b", fromCol: 0, col: 1, row: 1 }]);
  expect(result.order).toEqual([
    { col: 0, ids: ["a", "c"] },
    { col: 1, ids: ["d", "b", "e"] },
    { col: 2, ids: ["f"] },
  ]);
  expect([...result.touchedColumns]).toEqual([1, 0]);
  expect(result.css).toBe(
    '[data-board-card="a"]{grid-row:1}[data-board-card="c"]{grid-row:2}' +
      '[data-board-card="d"]{grid-row:1}[data-board-card="b"]{grid-row:2}[data-board-card="e"]{grid-row:3}',
  );
  expect(lanes[0]?.ids).toEqual(["a", "b", "c"]);
});

test("multiple holds use one computed order with each card present exactly once", () => {
  const result = projectBoardMoves(
    [
      { col: 0, ids: ["a", "b"] },
      { col: 1, ids: ["c", "d"] },
    ],
    [
      { cardId: "a", fromCol: 0, col: 1, row: 1 },
      { cardId: "c", fromCol: 1, col: 0, row: 0 },
    ],
  );
  expect(result.order).toEqual([
    { col: 0, ids: ["c", "b"] },
    { col: 1, ids: ["a", "d"] },
  ]);
  expect([...result.movedIds]).toEqual(["a", "c"]);
  expect(result.css).toContain('[data-board-card="c"]{grid-row:1}');
  expect(projectBoardMoves(result.order, []).css).toBe("");
  expect(projectBoardMoves(result.order, [{ cardId: "a", fromCol: 1, col: 0, row: 1 }], "#board-one").css).toContain(
    '#board-one [data-board-card="a"]{grid-row:2}',
  );
});
