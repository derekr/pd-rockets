import { expect, test } from "bun:test";
import { reduceDragState, type DragState } from "./drag-state";

type Target = { before: string };

test("drag state is independent of the input device", () => {
  let state: DragState<string, Target> = { kind: "idle" };
  state = reduceDragState(state, { type: "begin", itemId: "a" });
  state = reduceDragState(state, { type: "preview", target: { before: "b" } });
  state = reduceDragState(state, { type: "commit", target: { before: "b" } });
  expect(state).toEqual({ kind: "committing", itemId: "a", target: { before: "b" } });
});

test("commit without a preview does not invent a target", () => {
  expect(reduceDragState<string, Target>({ kind: "idle" }, { type: "commit", target: { before: "b" } })).toEqual({
    kind: "idle",
  });
});

test("cancel exits every preview state", () => {
  expect(reduceDragState({ kind: "previewing", itemId: "a", target: null }, { type: "cancel" })).toEqual({
    kind: "idle",
  });
});
