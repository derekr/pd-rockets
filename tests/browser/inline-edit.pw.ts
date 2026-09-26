import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => !!customElements.get("rocket-inline-edit"))).toBe(true);
  await page.evaluate(() => {
    (window as any).__edits = [];
    for (const event of ["rocket-inline-edit-request", "rocket-inline-edit-commit", "rocket-inline-edit-cancel"])
      document
        .querySelector("#edit-fixture")!
        .addEventListener(event, (message) =>
          (window as any).__edits.push({ type: message.type, detail: (message as CustomEvent).detail }),
        );
  });
});

test("two title presses request editing even when a parent captures the pointer", async ({ page }) => {
  await page.locator("#edit-fixture").evaluate((parent) => {
    parent.addEventListener("pointerdown", (event) => parent.setPointerCapture((event as PointerEvent).pointerId));
  });
  const title = page.locator("#edit-fixture [data-inline-edit-trigger]");
  await title.dblclick();
  expect(await page.evaluate(() => (window as any).__edits)).toEqual([
    { type: "rocket-inline-edit-request", detail: { contextId: "row-a" } },
  ]);
});

test("Enter and blur commit changes; Escape and unchanged values cancel", async ({ page }) => {
  const input = page.getByRole("textbox", { name: "Edit title" });
  await input.fill("Updated title");
  await input.press("Enter");
  expect(await page.evaluate(() => (window as any).__edits)).toEqual([
    { type: "rocket-inline-edit-commit", detail: { contextId: "row-a", value: "Updated title" } },
  ]);
  await input.fill("Draft title");
  await input.press("Escape");
  expect(await page.evaluate(() => (window as any).__edits)).toHaveLength(2);
  expect((await page.evaluate(() => (window as any).__edits))[1]).toEqual({
    type: "rocket-inline-edit-cancel",
    detail: { contextId: "row-a" },
  });
  await input.fill("Original title");
  await input.blur();
  expect((await page.evaluate(() => (window as any).__edits))[2]).toEqual({
    type: "rocket-inline-edit-cancel",
    detail: { contextId: "row-a" },
  });
});
