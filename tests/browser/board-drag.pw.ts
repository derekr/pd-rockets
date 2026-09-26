import { expect, test } from "@playwright/test";

test("board drag keeps the card in its lane, uses page preview markup, and commits a lane cell", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const { installBoardDrag } = (await new Function('return import("/rocket-kit.js")')()) as {
      installBoardDrag: (options: object) => { dispose(): void };
    };
    const host = document.createElement("section");
    host.id = "drag-board";
    host.innerHTML = `<div data-board-grid style="display:flex;gap:16px">
      <div data-board-lane data-col="0" style="width:160px;display:grid;grid-auto-rows:70px;align-content:start">
        <article data-board-card="a" tabindex="0" style="background:lightblue;height:70px"><span data-rocket-board-drag-handle>Drag A</span><template data-rocket-preview><strong>Page preview</strong></template></article>
      </div><div data-board-lane data-col="1" style="width:160px;display:grid;grid-auto-rows:70px;align-content:start">
        <article data-board-card="b" tabindex="0" style="background:lightgreen;height:70px">B</article>
      </div></div>`;
    document.body.append(host);
    (window as any).__moves = [];
    const lanes = () => [...host.querySelectorAll<HTMLElement>("[data-board-lane]")];
    (window as any).__boardDrag = installBoardDrag({
      host,
      lanes,
      snapshots: () =>
        lanes().map((lane) => ({
          col: Number(lane.dataset.col),
          ids: [...lane.querySelectorAll<HTMLElement>("[data-board-card]")].map((card) => card.dataset.boardCard!),
        })),
      cardId: (card: HTMLElement) => card.dataset.boardCard,
      cellOf: (card: HTMLElement) => ({
        col: Number(card.closest<HTMLElement>("[data-board-lane]")?.dataset.col),
        row: 0,
      }),
      projection: { setDropColumn() {}, setDropLine() {}, sync() {} },
      onStart: () => (window as any).__moves.push("start"),
      onCommit: (id: string, cell: object) => (window as any).__moves.push({ id, cell }),
      onCancel: () => (window as any).__moves.push("cancel"),
    });
  });
  const grip = page.locator("#drag-board [data-rocket-board-drag-handle]");
  await grip.scrollIntoViewIfNeeded();
  const box = (await grip.boundingBox())!;
  const target = (await page.locator('#drag-board [data-col="1"]').boundingBox())!;
  await page.mouse.move(box.x + 12, box.y + 12);
  await page.mouse.down();
  await page.mouse.move(target.x + 35, target.y + 50, { steps: 8 });
  await expect(page.locator("body > [data-board-preview]")).toContainText("Page preview");
  await expect(page.locator('#drag-board [data-col="0"] > [data-board-card="a"]')).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator("body > [data-board-preview]")).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).__moves)).toEqual(["start", { id: "a", cell: { col: 1, row: 0 } }]);
});
