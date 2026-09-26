import { expect, test } from "@playwright/test";

const boardMarkup = `
  <style id="board-styles">[data-board-card="a"]{grid-row:1}[data-board-card="b"]{grid-row:2}[data-board-card="c"]{grid-row:1}</style>
  <div data-board-grid>
    <div data-board-lane data-col="0"><article data-board-card="a"></article><article data-board-card="b"></article><div class="lane-empty"></div></div>
    <div data-board-lane data-col="1"><article data-board-card="c"></article><div class="lane-empty"></div></div>
  </div>`;

test("a held card projects across lanes, survives a fat morph and reveals confirmed CSS", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async (markup) => {
    const { installBoardProjection } = (await new Function('return import("/rocket-core.js")')()) as {
      installBoardProjection: (options: object) => { sync(): void; dispose(): void };
    };
    const host = document.createElement("div");
    host.id = "board-one";
    host.innerHTML = markup;
    document.body.append(host);
    const holds = new Map([["b", { col: 1, row: 0, fromCol: 0, state: "pending" }]]);
    const projection = installBoardProjection({
      host,
      gridSelector: "[data-board-grid]",
      truthStyleId: "board-styles",
      projectionStyleId: "board-projection",
      emptyLaneSelector: ".lane-empty",
      source: { holds: () => holds, preview: () => null },
    });
    (window as any).__boardProjection = { holds, projection };
  }, boardMarkup);
  const host = page.locator("#board-one");
  await expect(host.locator('[data-col="1"] > [data-board-card="b"]')).toHaveCount(1);
  await expect(host.locator('[data-board-card="b"]')).toHaveAttribute("data-persist-state", "pending");
  await expect(host.locator("#board-styles + #board-projection")).toHaveCount(1);
  expect(await host.locator('[data-board-card="b"]').evaluate((card) => getComputedStyle(card).gridRowStart)).toBe("1");
  await host.evaluate((element, markup) => {
    element.innerHTML = markup;
  }, boardMarkup);
  await expect(host.locator('[data-col="1"] > [data-board-card="b"]')).toHaveCount(1);
  await expect(host.locator("#board-styles + #board-projection")).toHaveCount(1);
  await page.evaluate(() => {
    const { holds, projection } = (window as any).__boardProjection;
    holds.clear();
    const host = document.querySelector("#board-one")!;
    host.innerHTML = `<style id="board-styles">[data-board-card="b"]{grid-row:2}</style>
      <div data-board-grid><div data-board-lane data-col="0"><article data-board-card="a"></article><div class="lane-empty"></div></div>
      <div data-board-lane data-col="1"><article data-board-card="c"></article><article data-board-card="b"></article><div class="lane-empty"></div></div></div>`;
    projection.sync();
  });
  await expect(host.locator('[data-board-card="b"]')).not.toHaveAttribute("data-persist-state");
  await expect(host.locator("#board-projection")).toBeEmpty();
  expect(await host.locator('[data-board-card="b"]').evaluate((card) => getComputedStyle(card).gridRowStart)).toBe("2");
});

test("two overlapping holds move only the held cards and preserve other nodes", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async (markup) => {
    const { installBoardProjection } = (await new Function('return import("/rocket-core.js")')()) as {
      installBoardProjection: (options: object) => { sync(): void; dispose(): void };
    };
    const host = document.createElement("div");
    host.id = "board-two";
    host.innerHTML = markup.replaceAll("board-styles", "other-truth");
    document.body.append(host);
    (window as any).__innocent = host.querySelector('[data-board-card="a"]');
    installBoardProjection({
      host,
      gridSelector: "[data-board-grid]",
      truthStyleId: "other-truth",
      projectionStyleId: "other-projection",
      emptyLaneSelector: ".lane-empty",
      source: {
        holds: () =>
          new Map([
            ["b", { col: 1, row: 0, fromCol: 0, state: "pending" }],
            ["c", { col: 0, row: 0, fromCol: 1, state: "uncertain" }],
          ]),
        preview: () => null,
      },
    });
  }, boardMarkup);
  const board = page.locator("#board-two");
  await expect(board.locator('[data-col="0"] > [data-board-card]').first()).toHaveAttribute("data-board-card", "c");
  expect(
    await board
      .locator('[data-col="0"] > [data-board-card]')
      .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-board-card"))),
  ).toEqual(["c", "a"]);
  expect(
    await board
      .locator('[data-col="1"] > [data-board-card]')
      .evaluateAll((cards) => cards.map((card) => card.getAttribute("data-board-card"))),
  ).toEqual(["b"]);
  expect(
    await page.evaluate(
      () => document.querySelector('#board-two [data-board-card="a"]') === (window as any).__innocent,
    ),
  ).toBe(true);
  await expect(board.locator('[data-board-card="c"]')).toHaveAttribute("data-persist-state", "uncertain");
});
