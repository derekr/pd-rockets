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

test("tree pointer preview updates only the active marker as the target changes", async ({ page }) => {
  await ready(page);
  const source = page.locator("#tree [data-tree-node=button] > [data-tree-row]");
  const folder = page.locator("#tree [data-tree-node=docs] > [data-tree-row]");
  const file = page.locator("#tree [data-tree-node=readme] > [data-tree-row]");
  await source.scrollIntoViewIfNeeded();
  const start = await source.boundingBox(),
    into = await folder.boundingBox(),
    before = await file.boundingBox();
  expect(start && into && before).toBeTruthy();
  await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
  await page.mouse.down();
  await page.mouse.move(into!.x + into!.width / 2, into!.y + into!.height / 2, { steps: 6 });
  await expect(folder).toHaveAttribute("data-tree-into", "");
  await page.mouse.move(before!.x + before!.width / 2, before!.y + 2, { steps: 6 });
  await expect(folder).not.toHaveAttribute("data-tree-into", "");
  await expect(file).toHaveAttribute("data-tree-before", "");
  await page.mouse.up();
  await expect(file).not.toHaveAttribute("data-tree-before", "");
  expect((await moves(page)).at(-1)?.detail).toMatchObject({ itemId: "button", toParent: "", before: "readme" });
});

test("pointer targets update across Kanban lanes, group lists, and bento grids", async ({ page }) => {
  await ready(page);
  for (const { source, destination, marked } of [
    {
      source: "#kanban [data-kanban-card=card-a]",
      destination: "#kanban [data-kanban-card=card-b]",
      marked: "#kanban [data-kanban-lane][data-col='1'][data-drop-active]",
    },
    {
      source: "#group [data-drag-item=note-a]",
      destination: "#group [data-drag-item=note-c]",
      marked: "#group [data-drop-list=later][data-drop-active]",
    },
    {
      source: "#bento [data-bento-item=tile-b]",
      destination: "#bento [data-bento-item=tile-d]",
      marked: "#bento [data-bento-grid=scratchpad] [data-bento-target]",
    },
  ]) {
    await page.locator(source).scrollIntoViewIfNeeded();
    const start = await page.locator(source).boundingBox();
    const target = await page.locator(destination).boundingBox();
    expect(start && target).toBeTruthy();
    await page.mouse.move(start!.x + start!.width / 2, start!.y + start!.height / 2);
    await page.mouse.down();
    await page.mouse.move(target!.x + target!.width / 2, target!.y + target!.height / 2, { steps: 8 });
    await expect(page.locator(marked)).toBeVisible();
    await page.mouse.up();
  }
  expect((await moves(page)).map(({ name }) => name)).toEqual([
    "rocket-kanban-move",
    "rocket-drag-group-move",
    "rocket-bento-move",
  ]);
});

test("server-rendered template outlets customize pointer preview and target indicators", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const host = document.querySelector("#list rocket-sortable-list")!;
    const preview = document.createElement("template");
    preview.dataset.rocketPreview = "";
    preview.className = "custom-preview";
    preview.innerHTML = '<strong class="preview-content">Floating task</strong>';
    host.querySelector("[data-sortable-item=list-a]")!.append(preview);
    const style = document.createElement("style");
    style.textContent = ".custom-preview[data-drag-preview] { width: 31px; height: 19px; }";
    document.head.append(style);
    for (const kind of ["before", "end"]) {
      const target = document.createElement("template");
      target.dataset.rocketTarget = kind;
      target.innerHTML = `<span class="custom-target">${kind}</span>`;
      host.append(target);
    }
  });
  const source = await page.locator("#list [data-sortable-item=list-a]").boundingBox();
  const destination = await page.locator("#list [data-sortable-item=list-c]").boundingBox();
  expect(source && destination).toBeTruthy();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination!.x + destination!.width / 2, destination!.y + 2, { steps: 6 });
  await expect(page.locator("body > .custom-preview[data-drag-preview] .preview-content")).toHaveText("Floating task");
  await expect(page.locator("body > .custom-preview[data-drag-preview]")).toHaveCSS("width", "31px");
  const floating = await page.locator("body > .custom-preview[data-drag-preview]").boundingBox();
  const pointer = { x: destination!.x + destination!.width / 2, y: destination!.y + 2 };
  expect(floating).not.toBeNull();
  expect(pointer.x).toBeGreaterThan(floating!.x);
  expect(pointer.x).toBeLessThan(floating!.x + floating!.width);
  expect(pointer.y).toBeGreaterThan(floating!.y);
  expect(pointer.y).toBeLessThan(floating!.y + floating!.height);
  await expect(page.locator("#list [data-sortable-item=list-c] [data-rocket-target-indicator=before]")).toContainText(
    "before",
  );
  await page.mouse.up();
  await expect(page.locator("body > [data-drag-preview]")).toHaveCount(0);
  await expect(page.locator("#list [data-rocket-target-indicator]")).toHaveCount(0);

  await page.locator('#list template[data-rocket-target="end"]').evaluate((template) => template.remove());
  await page.locator("#list [data-sortable-item=list-a]").focus();
  await page.keyboard.down("Alt");
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await expect(page.locator("#list [data-rocket-target-indicator]")).toHaveCount(0);
  await page.evaluate(() => {
    const template = document.createElement("template");
    template.dataset.rocketTarget = "";
    template.innerHTML = '<span class="custom-target">end</span>';
    document.querySelector("#list rocket-sortable-list")!.append(template);
  });
  await page.keyboard.press("Escape");
  await page.keyboard.press("j");
  await page.keyboard.press("j");
  await expect(page.locator("#list rocket-sortable-list > [data-rocket-target-indicator=end]")).toContainText("end");
  await page.keyboard.press("Escape");
  await page.keyboard.up("Alt");
  await expect(page.locator("#list [data-rocket-target-indicator]")).toHaveCount(0);
});

test("tree and bento expose their layout-specific target outlets", async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    for (const [selector, kind] of [
      ["#tree rocket-sortable-tree", "into"],
      ["#bento rocket-bento-workspace", "cell"],
    ]) {
      const template = document.createElement("template");
      template.dataset.rocketTarget = kind;
      template.innerHTML = `<span class="custom-target">${kind}</span>`;
      document.querySelector(selector)!.append(template);
    }
  });
  await page.locator("#tree [data-tree-node=button] > [data-tree-row]").scrollIntoViewIfNeeded();
  const source = await page.locator("#tree [data-tree-node=button] > [data-tree-row]").boundingBox();
  const folder = await page.locator("#tree [data-tree-node=docs] > [data-tree-row]").boundingBox();
  expect(source && folder).toBeTruthy();
  await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
  await page.mouse.down();
  await page.mouse.move(folder!.x + folder!.width / 2, folder!.y + folder!.height / 2, { steps: 6 });
  await expect(page.locator("#tree [data-tree-node=docs] > [data-tree-row]")).toHaveAttribute("data-tree-into", "");
  await expect(
    page.locator("#tree [data-tree-node=docs] > [data-tree-row] [data-rocket-target-indicator=into]"),
  ).toContainText("into");
  await page.mouse.up();
  await page.locator("#bento [data-bento-item=tile-b]").focus();
  await page.keyboard.down("Alt");
  await page.keyboard.press("j");
  await expect(page.locator("#bento [data-bento-target] [data-rocket-target-indicator=cell]")).toContainText("cell");
  await page.keyboard.press("Escape");
  await page.keyboard.up("Alt");
});
