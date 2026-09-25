import { expect, test } from "bun:test";
import { overlaps, placeWithPush } from "./placement";

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
