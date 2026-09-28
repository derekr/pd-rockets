import { expect, test } from "@playwright/test";

test("page-owned lane tabs navigate, survive replacement, and expose drag targets", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { installBoardLaneTabs } = (await new Function('return import("/pd-kit.js")')()) as {
      installBoardLaneTabs: (options: object) => object;
    };
    const host = document.createElement("section");
    host.id = "lane-tabs-board";
    host.innerHTML = `<nav><button data-tab="1">One</button><button data-tab="2">Two</button></nav>
      <div data-pager style="display:flex;overflow-x:auto;width:180px;scroll-snap-type:x mandatory">
        <div data-lane="1" style="flex:none;width:180px;height:30px">One</div>
        <div data-lane="2" style="flex:none;width:180px;height:30px">Two</div></div>`;
    document.body.append(host);
    (window as any).__targets = [];
    (window as any).__boardTabs = installBoardLaneTabs({
      host,
      tabSelector: "[data-tab]",
      scrollerSelector: "[data-pager]",
      lanes: () => [...host.querySelectorAll<HTMLElement>("[data-lane]")],
      tabColumn: (tab: HTMLElement) => Number(tab.dataset.tab),
      laneColumn: (lane: HTMLElement) => Number(lane.dataset.lane),
      mobileQuery: "(min-width: 0px)",
      draggingAttribute: "data-dragging",
      originAttribute: "data-origin",
      targetAttribute: "data-target",
      onDropTarget: (column: number | null, previous: number | null) =>
        (window as any).__targets.push([column, previous]),
      onDragFrames: (detail: object) => ((window as any).__frames = detail),
    });
  });
  const board = page.locator("#lane-tabs-board");
  const pager = board.locator("[data-pager]");
  await expect(board.locator('[data-tab="1"]')).toHaveAttribute("aria-selected", "true");
  await board.locator('[data-tab="2"]').click();
  await expect(board.locator('[data-tab="2"]')).toHaveAttribute("aria-selected", "true");
  await expect.poll(() => pager.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);

  await board.evaluate((host) => {
    const pager = host.querySelector("[data-pager]")!;
    pager.scrollLeft = 0;
    pager.dispatchEvent(new Event("scroll"));
  });
  await expect(board.locator('[data-tab="1"]')).toHaveAttribute("aria-selected", "true");

  await board.evaluate((host) => {
    const tabs = (window as any).__boardTabs;
    tabs.startCardDrag(1);
    host.querySelector("nav")!.innerHTML = '<button data-tab="1">One</button><button data-tab="2">Two</button>';
    tabs.reassert();
  });
  await expect(board.locator('[data-tab="1"]')).toHaveAttribute("data-origin", "");
  const box = (await board.locator('[data-tab="2"]').boundingBox())!;
  await page.evaluate(
    ([x, y]) => {
      (window as any).__boardTabs.trackPointer(new PointerEvent("pointermove", { clientX: x, clientY: y }));
    },
    [box.x + box.width / 2, box.y + box.height / 2],
  );
  await expect(board.locator('[data-tab="2"]')).toHaveAttribute("data-target", "");
  await page.evaluate(() => {
    const tabs = (window as any).__boardTabs;
    tabs.trackPointer(new PointerEvent("pointermove", { clientX: 0, clientY: 0 }));
    tabs.updateDropTarget();
    tabs.finishCardDrag();
    tabs.dispose();
  });
  await expect(board).not.toHaveAttribute("data-dragging");
  expect(await page.evaluate(() => (window as any).__targets)).toContainEqual([null, 2]);
  expect(await page.evaluate(() => (window as any).__frames.durationMs)).toBeGreaterThanOrEqual(0);
});
