import { expect, test } from "@playwright/test";

test("resize preview uses the configured delay", async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => !!customElements.get("pd-bento-workspace"))).toBe(true);
  const host = page.locator("#bento pd-bento-workspace");
  await host.evaluate((element) => element.setAttribute("data-resize-preview-delay-ms", "1000"));
  await page.clock.install();
  await page.clock.pauseAt(new Date(Date.now() + 1000));
  await page.locator("#bento [data-bento-item=tile-b]").focus();
  await page.keyboard.press("Shift+ArrowDown");
  await page.clock.runFor(999);
  await expect(host.locator("[data-bento-projecting]")).toHaveCount(1);
  await expect(host.locator("[data-bento-target]")).toHaveCount(1);
  await page.clock.runFor(1);
  await expect(host.locator("[data-bento-projecting]")).toHaveCount(0);
  await expect(host.locator("[data-bento-target]")).toHaveCount(0);
});
