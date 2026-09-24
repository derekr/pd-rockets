import { expect, test } from "bun:test";
import { keyMatches } from "./keyboard";

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
