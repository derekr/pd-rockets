import { expect, test } from "bun:test";
import { insertionBefore } from "./insertion-target";

test("insertion points include above first, between items, and after last", () => {
  const items = [
    { id: "a", top: 20, bottom: 60 },
    { id: "b", top: 70, bottom: 110 },
    { id: "c", top: 120, bottom: 160 },
  ];
  expect(insertionBefore(items, 5)).toBe("a");
  expect(insertionBefore(items, 90)).toBe("c");
  expect(insertionBefore(items, 150)).toBe("");
  expect(
    insertionBefore(
      items.filter((item) => item.id !== "b"),
      90,
    ),
  ).toBe("c");
  expect(insertionBefore([], 20)).toBe("");
});
