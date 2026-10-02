import { expect, test } from "@playwright/test";

for (const kind of ["move", "resize"] as const) {
  for (const delay of [undefined, 1000, 0]) {
    test(`${kind} preview uses ${delay ?? "the default"} delay`, async ({ page }) => {
      await page.goto("/");
      await expect.poll(() => page.evaluate(() => !!customElements.get("pd-bento-workspace"))).toBe(true);
      const host = page.locator("#bento pd-bento-workspace");
      if (delay !== undefined) {
        await host.evaluate((element, delay) => element.setAttribute("data-preview-delay-ms", String(delay)), delay);
      }
      await page.clock.install();
      await page.clock.pauseAt(new Date(Date.now() + 1000));
      await page.locator("#bento [data-bento-item=tile-b]").focus();
      await page.keyboard.press(kind === "move" ? "Alt+ArrowDown" : "Shift+ArrowDown");
      const expectedDelay = delay ?? 2000;
      if (expectedDelay > 0) await page.clock.runFor(expectedDelay - 1);
      await expect(host.locator("[data-bento-projecting]")).toHaveCount(1);
      await expect(host.locator("[data-bento-target]")).toHaveCount(1);
      await page.clock.runFor(1);
      await expect(host.locator("[data-bento-projecting]")).toHaveCount(0);
      await expect(host.locator("[data-bento-target]")).toHaveCount(0);
    });
  }
}
