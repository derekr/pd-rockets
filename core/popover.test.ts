import { expect, test } from "bun:test";
import { popoverPosition } from "./popover";

test("submenu flips at the viewport edge and clamps vertically", () => {
  const trigger = { left: 340, right: 390, top: 250, bottom: 280, width: 50, height: 30 };
  expect(popoverPosition(trigger, { width: 160, height: 120 }, { width: 400, height: 320 }, "beside")).toEqual({
    left: 174,
    top: 192,
  });
});

test("point opening stays within viewport", () => {
  expect(
    popoverPosition({ x: 390, y: 310 }, { width: 150, height: 100 }, { width: 400, height: 320 }, "point"),
  ).toEqual({ left: 242, top: 212 });
});
