import { expect, test } from "bun:test";
import { cancelKeys, focusKeys, keyboardBindings, keyMatches, moveKeys } from "./keyboard";

test("Alt+vim shortcuts match physical keys even when Option produces a symbol", () => {
  const key = (key: string, code: string, altKey = true) => ({
    key,
    code,
    altKey,
    shiftKey: false,
    metaKey: false,
    ctrlKey: false,
  });
  expect(keyMatches("Alt+h", key("˙", "KeyH"))).toBe(true);
  expect(keyMatches("Alt+j", key("∆", "KeyJ"))).toBe(true);
  expect(keyMatches("Alt+k", key("˚", "KeyK"))).toBe(true);
  expect(keyMatches("Alt+l", key("¬", "KeyL"))).toBe(true);
  expect(keyMatches("Alt+l", key("l", "KeyL", false))).toBe(false);
  expect(keyMatches("Alt+l", key("¬", "KeyK"))).toBe(false);
  expect(keyMatches("l", key("l", "KeyL", false))).toBe(true);
});

test("host keyboard intents override, disable, and preserve legacy aliases", () => {
  const host = { dataset: { keyFocusNext: "n", keyFocusPrevious: "", keySelectNext: "x" } } as unknown as HTMLElement;
  const keys = keyboardBindings(host, { ...focusKeys, ...moveKeys }, { focusNext: "selectNext" });
  const event = (key: string, altKey = false) =>
    ({
      key,
      code: `Key${key.toUpperCase()}`,
      altKey,
      shiftKey: false,
      metaKey: false,
      ctrlKey: false,
    }) as KeyboardEvent;
  expect(keys.bindings.focusNext).toEqual(["n"]);
  expect(keys.direction(event("n"), "focus")).toEqual({ x: 0, y: 1 });
  expect(keys.direction(event("x"), "focus").y).toBe(0);
  expect(keys.direction(event("k"), "focus").y).toBe(0);
  expect(keys.direction(event("j", true), "move").y).toBe(1);
  const legacy = keyboardBindings({ dataset: { keySelectNext: "x" } } as unknown as HTMLElement, focusKeys, {
    focusNext: "selectNext",
  });
  expect(legacy.direction(event("x"), "focus").y).toBe(1);
});

test("Escape cancels a held modifier, while Ctrl and Meta shortcuts remain distinct", () => {
  const keys = keyboardBindings({ dataset: {} } as HTMLElement, cancelKeys);
  const event = { key: "Escape", code: "Escape", altKey: true, shiftKey: false, ctrlKey: false, metaKey: false };
  expect(keys.matches("cancel", event as KeyboardEvent)).toBe(true);
  expect(keyMatches("Ctrl+j", { ...event, key: "j", code: "KeyJ", altKey: false, ctrlKey: true })).toBe(true);
  expect(keyMatches("Meta+j", { ...event, key: "j", code: "KeyJ", altKey: false, ctrlKey: true })).toBe(false);
});
