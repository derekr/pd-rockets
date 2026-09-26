import { expect, test } from "bun:test";
import { isReleaseTag, nextReleaseTag } from "./release-tags";

test("date release tags validate real UTC dates and same-day sequence numbers", () => {
  expect(isReleaseTag("v2026-09-26")).toBe(true);
  expect(isReleaseTag("v2024-02-29-2")).toBe(true);
  for (const tag of ["v0.1.0", "v2026-02-29", "v2026-13-01", "v2026-09-26-1", "v2026-09-26-02"]) {
    expect(isReleaseTag(tag)).toBe(false);
  }
  const date = new Date("2026-09-26T23:59:59Z");
  expect(nextReleaseTag(date, [])).toBe("v2026-09-26");
  expect(nextReleaseTag(date, ["v2026-09-26", "v2026-09-26-2"])).toBe("v2026-09-26-3");
  expect(nextReleaseTag(date, ["v2026-09-26", "v2026-09-26-3"])).toBe("v2026-09-26-4");
});
