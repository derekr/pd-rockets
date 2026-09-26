import { expect, test } from "@playwright/test";

test("optional column reorder accepts desktop heads and mobile tabs without owning either layout", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { installBoardColumnReorder } = (await new Function('return import("/rocket-kit.js")')()) as {
      installBoardColumnReorder: (options: object) => { dispose(): void };
    };
    const host = document.createElement("div");
    host.id = "reorder-board";
    host.innerHTML = `<div style="display:flex;gap:12px">
      <div data-rocket-board-column data-col="0" style="width:120px;height:60px"><button data-rocket-board-column-grip>Grip A</button><button data-rocket-board-column-step="1">Step A</button></div>
      <div data-rocket-board-column data-col="1" style="width:120px;height:60px"><button data-rocket-board-column-grip>Grip B</button></div>
    </div><div style="display:flex;gap:12px">
      <div data-rocket-board-mobile-column data-col="0" style="width:120px;height:60px"><span data-rocket-board-column-grip data-rocket-board-mobile-grip>Tab grip A</span></div>
      <div data-rocket-board-mobile-column data-col="1" style="width:120px;height:60px"><span data-rocket-board-column-grip data-rocket-board-mobile-grip>Tab grip B</span></div>
    </div>`;
    document.body.append(host);
    (window as any).__reorders = [];
    (window as any).__reorder = installBoardColumnReorder({
      host,
      onReorder: (columnId: number, to: number) => (window as any).__reorders.push({ columnId, to }),
    });
  });
  const grip = page.getByRole("button", { name: "Grip A" });
  await grip.scrollIntoViewIfNeeded();
  const source = (await grip.boundingBox())!;
  const dest = (await page.locator('[data-rocket-board-column][data-col="1"]').boundingBox())!;
  await page.mouse.move(source.x + 8, source.y + 8);
  await page.mouse.down();
  await page.mouse.move(dest.x + dest.width / 2, dest.y + 10, { steps: 4 });
  await expect(page.locator('[data-rocket-board-column][data-col="1"]')).toHaveAttribute("data-column-drop-target", "");
  await page.mouse.up();
  await page.getByRole("button", { name: "Step A" }).click();
  const mobile = page.locator('[data-rocket-board-mobile-column][data-col="1"] [data-rocket-board-mobile-grip]');
  const target = page.locator('[data-rocket-board-mobile-column][data-col="0"]');
  const m = (await mobile.boundingBox())!;
  const t = (await target.boundingBox())!;
  await page.mouse.move(m.x + 8, m.y + 8);
  await page.mouse.down();
  await page.mouse.move(t.x + 20, t.y + 10, { steps: 4 });
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).__reorders)).toEqual([
    { columnId: 0, to: 1 },
    { columnId: 0, to: 1 },
    { columnId: 1, to: 0 },
  ]);
});
