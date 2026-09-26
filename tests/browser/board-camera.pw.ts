import { expect, test } from "@playwright/test";

test("optional board camera scrolls the active lane and recomputes the target after settling", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { installBoardCamera } = (await new Function('return import("/rocket-kit.js")')()) as {
      installBoardCamera: (options: object) => () => void;
    };
    const host = document.createElement("section");
    host.id = "camera-board";
    host.innerHTML = `<div data-board-lane style="height:180px;width:180px;overflow-y:auto">
      <div style="height:1200px">Scrollable lane</div></div>`;
    document.body.append(host);
    (window as any).__settled = 0;
    (window as any).__stopCamera = installBoardCamera({
      host,
      lanes: () => [...host.querySelectorAll<HTMLElement>("[data-board-lane]")],
      engaged: () => true,
      settle: () => (window as any).__settled++,
    });
  });
  const lane = page.locator("#camera-board [data-board-lane]");
  await lane.scrollIntoViewIfNeeded();
  const box = (await lane.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + 50);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 8);
  await expect.poll(() => lane.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => (window as any).__settled)).toBeGreaterThan(0);
});
