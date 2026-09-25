import { expect, test, type Page } from "@playwright/test";

async function ready(page: Page, query = "") {
  await page.addInitScript(() => {
    (window as any).__moves = [];
    for (const name of [
      "rocket-kanban-move",
      "rocket-sortable-move",
      "rocket-drag-group-move",
      "rocket-bento-move",
      "rocket-tree-move",
    ])
      document.addEventListener(name, (event) =>
        (window as any).__moves.push({ name, detail: (event as CustomEvent).detail }),
      );
  });
  await page.goto(`/${query}`);
  await expect.poll(() => page.evaluate(() => !!customElements.get("rocket-sortable-tree"))).toBe(true);
}

const moves = (page: Page) =>
  page.evaluate(() => (window as any).__moves as { name: string; detail: Record<string, unknown> }[]);

test("all surfaces use plain vim keys for focus without emitting moves", async ({ page }) => {
  await ready(page);
  const cases = [
    { start: "#kanban [data-kanban-card=card-a]", key: "j", next: "#kanban [data-kanban-card=card-b]" },
    { start: "#list [data-sortable-item=list-a]", key: "j", next: "#list [data-sortable-item=list-b]" },
    { start: "#group [data-drag-item=note-a]", key: "j", next: "#group [data-drag-item=note-b]" },
    { start: "#bento [data-bento-item=tile-b]", key: "j", next: "#bento [data-bento-item=tile-c]" },
    {
      start: "#tree [data-tree-node=src] > [data-tree-row]",
      key: "j",
      next: "#tree [data-tree-node=components] > [data-tree-row]",
    },
  ];
  for (const { start, key, next } of cases) {
    await page.locator(start).focus();
    await page.keyboard.press(key);
    await expect(page.locator(next)).toBeFocused();
  }
  expect(await moves(page)).toEqual([]);
});

test("the consumer can map Rocket to a separate module entry", async ({ page }) => {
  await ready(page, "?runtime=adapter");
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.press("j");
  await expect(page.locator("#list [data-sortable-item=list-b]")).toBeFocused();
});

test("group and tree use h/l for focus between regions and folder levels", async ({ page }) => {
  await ready(page);
  await page.locator("#group [data-drag-item=note-b]").focus();
  await page.keyboard.press("l");
  await expect(page.locator("#group [data-drag-item=note-c]")).toBeFocused();
  await page.keyboard.press("h");
  await expect(page.locator("#group [data-drag-item=note-a]")).toBeFocused();
  await page.locator("#tree [data-tree-node=src] > [data-tree-row]").focus();
  await page.keyboard.press("l");
  await expect(page.locator("#tree [data-tree-node=components] > [data-tree-row]")).toBeFocused();
  await page.keyboard.press("h");
  await expect(page.locator("#tree [data-tree-node=components] > [data-tree-row]")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.keyboard.press("h");
  await expect(page.locator("#tree [data-tree-node=src] > [data-tree-row]")).toBeFocused();
});

test("a wide tile reaches the last column before crossing grids", async ({ page }) => {
  await ready(page);
  await page.locator("#bento [data-bento-item=tile-a]").focus();
  await page.keyboard.down("Alt");
  for (const col of ["2 / span 2", "3 / span 2", "1 / span 2", "2 / span 2", "3 / span 2"]) {
    await page.keyboard.press("l");
    await expect(page.locator("#bento [data-bento-target]")).toHaveCSS("grid-column", col);
  }
  await page.keyboard.up("Alt");
  const events = await moves(page);
  expect(events).toHaveLength(1);
  expect(events[0]?.detail).toMatchObject({ itemId: "tile-a", toGrid: "scratchpad" });
});

test("tree moves a first child out above its parent and Escape cancels", async ({ page }) => {
  await ready(page);
  await page.locator("#tree [data-tree-node=button] > [data-tree-row]").focus();
  await page.keyboard.press("Alt+k");
  expect((await moves(page))[0]?.detail).toMatchObject({
    itemId: "button",
    fromParent: "components",
    toParent: "src",
    before: "components",
  });
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.down("Alt");
  await page.keyboard.press("j");
  await page.keyboard.press("Escape");
  await page.keyboard.up("Alt");
  expect(await moves(page)).toHaveLength(1);
});

test("per-host bindings override or disable defaults", async ({ page }) => {
  await ready(page, "?keyboard=custom");
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.press("j");
  await expect(page.locator("#list [data-sortable-item=list-a]")).toBeFocused();
  await page.keyboard.press("n");
  await expect(page.locator("#list [data-sortable-item=list-b]")).toBeFocused();
  await page.keyboard.press("p");
  await expect(page.locator("#list [data-sortable-item=list-a]")).toBeFocused();
  await page.goto("/?keyboard=disabled");
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.press("j");
  await expect(page.locator("#list [data-sortable-item=list-a]")).toBeFocused();
});

test("app capture shortcuts take priority, and editable descendants keep their keys", async ({ page }) => {
  await ready(page);
  await page.evaluate(() =>
    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key === "j") event.preventDefault();
      },
      true,
    ),
  );
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.press("j");
  await expect(page.locator("#list [data-sortable-item=list-a]")).toBeFocused();
  await page.evaluate(() => {
    const input = document.createElement("input");
    input.id = "inline-editor";
    document.querySelector("#list [data-sortable-item=list-a]")!.append(input);
  });
  await page.locator("#inline-editor").focus();
  await page.keyboard.press("k");
  await expect(page.locator("#inline-editor")).toBeFocused();
  await expect(page.locator("#inline-editor")).toHaveValue("k");
});

test("an inner host owns navigation and staging, not its outer host", async ({ page }) => {
  await ready(page);
  await page.locator("#nested [data-sortable-item=inner-a]").focus();
  await page.keyboard.press("j");
  await expect(page.locator("#nested [data-sortable-item=inner-b]")).toBeFocused();
  await page.keyboard.press("Alt+k");
  const events = await moves(page);
  expect(events.map((event) => event.name)).toEqual(["rocket-sortable-move"]);
});

test("Kanban keeps legacy bindings while a canonical host override takes precedence", async ({ page }) => {
  await ready(page, "?keyboard=kanban");
  await page.locator("#kanban [data-kanban-card=card-a]").focus();
  await page.keyboard.press("j");
  await expect(page.locator("#kanban [data-kanban-card=card-a]")).toBeFocused();
  await page.keyboard.press("n");
  await expect(page.locator("#kanban [data-kanban-card=card-b]")).toBeFocused();
});

test("moving focus elsewhere cancels a staged move before modifier release", async ({ page }) => {
  await ready(page);
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.down("Alt");
  await page.keyboard.press("j");
  await expect(page.locator("#list rocket-sortable-list")).toHaveAttribute("data-key-staging", "");
  await page.locator("#outside").focus();
  await page.keyboard.up("Alt");
  expect(await moves(page)).toEqual([]);
  await expect(page.locator("#outside")).toBeFocused();
});

test("focus returns after a delayed model-confirmed morph but never steals a later focus choice", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    (window as any).__patches = 0;
    document.querySelector("#list rocket-sortable-list")!.addEventListener("rocket-sortable-move", (event) => {
      const { itemId, before } = (event as CustomEvent<{ itemId: string; before: string }>).detail;
      setTimeout(() => {
        const host = document.querySelector("#list rocket-sortable-list")!;
        const item = host.querySelector(`[data-sortable-item="${itemId}"]`)!;
        const target = before ? host.querySelector(`[data-sortable-item="${before}"]`) : null;
        host.insertBefore(item.cloneNode(true), target);
        item.remove();
        (window as any).__patches++;
      }, 50);
    });
  });
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.press("Alt+j");
  await expect.poll(() => page.evaluate(() => (window as any).__patches)).toBe(1);
  await expect(page.locator("#list [data-sortable-item=list-a]")).toBeFocused();
  await page.locator("#outside").focus();
  await page.locator("#list [data-sortable-item=list-b]").focus();
  await page.keyboard.press("Alt+j");
  await page.locator("#outside").focus();
  await expect.poll(() => page.evaluate(() => (window as any).__patches)).toBe(2);
  await expect(page.locator("#outside")).toBeFocused();
});

test("bento resize stages with Shift and Escape cancels without an event", async ({ page }) => {
  await ready(page);
  await page.locator("#bento [data-bento-item=tile-b]").focus();
  await page.keyboard.down("Shift");
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#bento [data-bento-target]")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.keyboard.up("Shift");
  expect(await moves(page)).toEqual([]);
});

test("pointer drag emits a semantic move and staging is cancelled by a pointer gesture", async ({ page }) => {
  await ready(page);
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.down("Alt");
  await page.keyboard.press("j");
  const source = await page.locator("#list [data-sortable-item=list-a]").boundingBox();
  const destination = await page.locator("#list [data-sortable-item=list-c]").boundingBox();
  expect(source && destination).toBeTruthy();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await expect(page.locator("#list rocket-sortable-list")).not.toHaveAttribute("data-key-staging", "");
  await page.mouse.move(destination!.x + destination!.width / 2, destination!.y + destination!.height / 4, {
    steps: 6,
  });
  await page.mouse.up();
  await page.keyboard.up("Alt");
  const events = await moves(page);
  expect(events).toHaveLength(1);
  expect(events[0]).toMatchObject({ name: "rocket-sortable-move", detail: { itemId: "list-a", before: "list-c" } });
});
