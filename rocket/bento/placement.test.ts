import { expect, test } from "bun:test";
import { nextBentoColumn, overlaps, placeWithPush, projectBentoLayout } from "./placement";

test("a wide tile reaches the last valid column before crossing a grid boundary", () => {
  expect(nextBentoColumn(1, 2, 4, 1)).toBe(2);
  expect(nextBentoColumn(2, 2, 4, 1)).toBe(3);
  expect(nextBentoColumn(3, 2, 4, 1)).toBeNull();
  expect(nextBentoColumn(1, 2, 4, -1)).toBeNull();
});

test("a moved multi-cell tile stays anchored and pushes collisions down", () => {
  const items = [
    { id: "a", col: 1, row: 1, width: 2, height: 1 },
    { id: "b", col: 3, row: 1, width: 2, height: 1 },
    { id: "c", col: 1, row: 2, width: 2, height: 1 },
  ];
  const placed = placeWithPush(items, { id: "a", col: 1, row: 2, width: 2, height: 2 }, 4);
  expect(placed.find((item) => item.id === "a")).toEqual({ id: "a", col: 1, row: 2, width: 2, height: 2 });
  expect(placed.find((item) => item.id === "c")?.row).toBe(4);
  expect(placed.every((item, index) => placed.slice(index + 1).every((other) => !overlaps(item, other)))).toBe(true);
});

test("placement clamps spans to the destination column count", () => {
  expect(placeWithPush([], { id: "a", col: 4, row: 0, width: 3, height: 1 }, 2)[0]).toMatchObject({
    col: 1,
    row: 1,
    width: 2,
  });
});

test("cross-grid projection includes the moved tile and every displaced tile", () => {
  const grids = [
    { id: "source", columns: 4, items: [{ id: "a", col: 1, row: 1, width: 2, height: 2 }] },
    {
      id: "target",
      columns: 4,
      items: [
        { id: "b", col: 1, row: 1, width: 2, height: 1 },
        { id: "c", col: 1, row: 2, width: 1, height: 1 },
        { id: "d", col: 3, row: 1, width: 2, height: 1 },
      ],
    },
  ];
  const updates = projectBentoLayout(grids, "a", "target", { col: 1, row: 1, width: 2, height: 2 });
  expect(updates).toEqual([
    { itemId: "a", grid: "target", col: 1, row: 1, width: 2, height: 2 },
    { itemId: "b", grid: "target", col: 1, row: 3, width: 2, height: 1 },
    { itemId: "c", grid: "target", col: 1, row: 4, width: 1, height: 1 },
  ]);
  expect(projectBentoLayout(grids, "a", "target", { col: 3, row: 2, width: 2, height: 1 })).toEqual([
    { itemId: "a", grid: "target", col: 3, row: 2, width: 2, height: 1 },
  ]);
});

test("resize projection returns only changed positions and leaves confirmed input untouched", () => {
  const items = [
    { id: "a", col: 1, row: 1, width: 1, height: 1 },
    { id: "b", col: 2, row: 1, width: 1, height: 1 },
  ];
  const grids = [{ id: "one", columns: 4, items }];
  expect(projectBentoLayout(grids, "a", "one", { col: 1, row: 1, width: 2, height: 1 })).toEqual([
    { itemId: "a", grid: "one", col: 1, row: 1, width: 2, height: 1 },
    { itemId: "b", grid: "one", col: 2, row: 2, width: 1, height: 1 },
  ]);
  expect(items[1]?.row).toBe(1);
  expect(projectBentoLayout(grids, "a", "one", items[0]!)).toEqual([]);
});
