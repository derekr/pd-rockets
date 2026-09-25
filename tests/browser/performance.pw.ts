import { expect, test, type Page } from "@playwright/test";

// Informational interaction timings. Excluded from the normal correctness suite by Playwright config.

const surfaces = [
  {
    name: "kanban",
    host: "#kanban rocket-kanban-board",
    item: "[data-kanban-card]",
    id: "kanbanCard",
    count: 120,
    destination: "[data-kanban-card=card-b]",
  },
  {
    name: "list",
    host: "#list rocket-sortable-list",
    item: "[data-sortable-item]",
    id: "sortableItem",
    count: 160,
    destination: "[data-sortable-item=list-b]",
  },
  {
    name: "group",
    host: "#group rocket-drag-group",
    item: "[data-drag-item]",
    id: "dragItem",
    count: 120,
    destination: "[data-drag-item=note-b]",
  },
  {
    name: "bento",
    host: "#bento rocket-bento-workspace",
    item: "[data-bento-item]",
    id: "bentoItem",
    count: 72,
    destination: "[data-bento-item=tile-c]",
  },
  {
    name: "tree",
    host: "#tree rocket-sortable-tree",
    item: "[data-tree-node]",
    id: "treeNode",
    count: 600,
    destination: "[data-tree-node=docs] > [data-tree-row]",
  },
] as const;

function summary(samples: number[]) {
  const sorted = samples.sort((a, b) => a - b);
  const percentile = (fraction: number) => Number(sorted[Math.floor((sorted.length - 1) * fraction)]!.toFixed(3));
  return { p50: percentile(0.5), p95: percentile(0.95) };
}

async function enlarge(page: Page, surface: (typeof surfaces)[number]) {
  await page.evaluate(({ name, host, item, id, count }) => {
    const root = document.querySelector(host)!;
    const source = root.querySelector<HTMLElement>(name === "tree" ? "[data-tree-node=readme]" : item)!;
    const container = source.parentElement!;
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < count; i++) {
      const clone = source.cloneNode(true) as HTMLElement;
      clone.dataset[id] = `synthetic-${i}`;
      if (name === "bento") {
        clone.dataset.bentoCol = String((i % 4) + 1);
        clone.dataset.bentoRow = String(Math.floor(i / 4) + 4);
        clone.dataset.bentoWidth = "1";
        clone.dataset.bentoHeight = "1";
        clone.style.gridColumn = `${clone.dataset.bentoCol} / span 1`;
        clone.style.gridRow = `${clone.dataset.bentoRow} / span 1`;
      }
      fragment.append(clone);
    }
    container.append(fragment);
  }, surface);
}

async function measureKeyboard(page: Page, surface: (typeof surfaces)[number]) {
  return page.evaluate(({ host, item, name }) => {
    const root = document.querySelector(host)!;
    const source =
      name === "tree"
        ? root.querySelector<HTMLElement>("[data-tree-node=button] > [data-tree-row]")!
        : root.querySelector<HTMLElement>(item)!;
    const samples = { focus: [] as number[], move: [] as number[] };
    for (let i = 0; i < 140; i++) {
      source.focus();
      const start = performance.now();
      source.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
      if (i >= 20) samples.focus.push(performance.now() - start);
      source.focus();
      const moveStart = performance.now();
      source.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowDown", altKey: true, bubbles: true, cancelable: true }),
      );
      if (i >= 20) samples.move.push(performance.now() - moveStart);
      source.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", altKey: true, bubbles: true, cancelable: true }),
      );
    }
    return samples;
  }, surface);
}

async function measurePointer(page: Page, surface: (typeof surfaces)[number]) {
  const source = page
    .locator(
      surface.name === "tree"
        ? `${surface.host} [data-tree-node=button] > [data-tree-row]`
        : `${surface.host} ${surface.item}`,
    )
    .first();
  await source.scrollIntoViewIfNeeded();
  const rect = await source.boundingBox();
  expect(rect).not.toBeNull();
  const x = rect!.x + rect!.width / 2,
    y = rect!.y + rect!.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 10, y + 8);
  await expect(page.locator(surface.host)).toHaveAttribute("data-drag-active", "");
  const destination = await page.locator(`${surface.host} ${surface.destination}`).boundingBox();
  expect(destination).not.toBeNull();
  expect(
    await page.evaluate(
      ({ host, x, y }) => {
        const hit = document.elementFromPoint(x, y);
        return !!hit && document.querySelector(host)?.contains(hit);
      },
      { host: surface.host, x: destination!.x + destination!.width / 2, y: destination!.y + destination!.height / 2 },
    ),
  ).toBe(true);
  const samples = await page.evaluate(
    ({ x, y, destination }) => {
      const stationary: number[] = [],
        changing: number[] = [];
      for (let i = 0; i < 120; i++) {
        const start = performance.now();
        window.dispatchEvent(
          new PointerEvent("pointermove", { pointerId: 1, clientX: x + 10 + (i % 3), clientY: y + 8 + (i % 3) }),
        );
        if (i >= 20) stationary.push(performance.now() - start);
      }
      for (let i = 0; i < 120; i++) {
        const point = i % 2 ? { x: x + 10, y: y + 8 } : destination;
        const start = performance.now();
        window.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: point.x, clientY: point.y }));
        if (i >= 20) changing.push(performance.now() - start);
      }
      return { stationary, changing };
    },
    { x, y, destination: { x: destination!.x + destination!.width / 2, y: destination!.y + destination!.height / 2 } },
  );
  await page.mouse.up();
  return samples;
}

for (const surface of surfaces) {
  test(`${surface.name} interaction timing`, async ({ page }) => {
    await page.goto("/");
    await expect.poll(() => page.evaluate(() => !!customElements.get("rocket-sortable-tree"))).toBe(true);
    await enlarge(page, surface);
    const keyboard = await measureKeyboard(page, surface);
    const pointer = await measurePointer(page, surface);
    console.log(
      JSON.stringify({
        surface: surface.name,
        items: surface.count,
        focus: summary(keyboard.focus),
        move: summary(keyboard.move),
        pointerStationary: summary(pointer.stationary),
        pointerChanging: summary(pointer.changing),
      }),
    );
  });
}
