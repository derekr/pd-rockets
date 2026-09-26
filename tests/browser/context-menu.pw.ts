import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect.poll(() => page.evaluate(() => !!customElements.get("rocket-context-menu"))).toBe(true);
});

test("button and right-click open a bound menu; an action returns focus", async ({ page }) => {
  const menu = page.locator("#fixture-menu");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await expect(menu).toBeVisible();
  await expect(menu).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "View row-a" })).toBeFocused();
  await page.evaluate(() => {
    (window as any).__actions = [];
    document.querySelector("#fixture-menu")!.addEventListener("rocket-menu-action", (event) => {
      (window as any).__actions.push((event as CustomEvent).detail);
    });
  });
  await menu.getByRole("menuitem", { name: "View row-a" }).click();
  await expect(menu).not.toBeVisible();
  await expect(page.locator("#menu-fixture button[data-menu-for]")).toBeFocused();
  expect(await page.evaluate(() => (window as any).__actions)).toEqual([{ action: "view", contextId: "row-a" }]);
  await page.locator("#menu-fixture [data-context-id=row-b]").click({ button: "right" });
  await expect(menu).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "View row-b" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
});

test("nested menus support keyboard depth, branch return, and light dismiss", async ({ page }) => {
  const menu = page.locator("#fixture-menu");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "More" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(menu.locator("#fixture-sub-one")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Copy" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("l");
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Archive" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu.getByRole("menuitem", { name: "Advanced" })).toBeFocused();
  await page.keyboard.press("h");
  await expect(menu.getByRole("menuitem", { name: "More" })).toBeFocused();
  await page.locator("#outside").click();
  await expect(menu).not.toBeVisible();
});

test("template binding includes nested text and attributes without changing the source", async ({ page }) => {
  const menu = page.locator("#fixture-menu");
  await menu.evaluate((host: any) =>
    host.openFor(document.querySelector("#menu-fixture [data-context-id=row-b]"), undefined, { label: "A < B" }),
  );
  await expect(menu.getByRole("menuitem", { name: "Label A < B" })).toHaveAttribute("data-menu-param-record", "row-b");
  expect(
    await menu.locator("template[data-rocket-menu]").evaluate((template) => template.innerHTML.includes("{label}")),
  ).toBe(true);
  await page.keyboard.press("Escape");
  await menu.locator("template[data-rocket-menu]").evaluate((template: HTMLTemplateElement) => {
    template.content.querySelector('[data-action="view"]')!.textContent = "Updated {contextId}";
  });
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Updated row-a" })).toBeFocused();
});

test("pointer can open two submenu levels and commit from the deepest level", async ({ page }) => {
  await page.locator("#menu-fixture button[data-menu-for]").click();
  const menu = page.locator("#fixture-menu");
  const more = menu.getByRole("menuitem", { name: "More" });
  await more.click();
  await expect(menu.locator("#fixture-sub-one")).toBeVisible();
  await menu.getByRole("menuitem", { name: "Advanced" }).click();
  await expect(menu.locator("#fixture-sub-two")).toBeVisible();
  await menu.getByRole("menuitem", { name: "Archive" }).click();
  await expect(menu).not.toBeVisible();
  await expect(page.locator("#menu-fixture button[data-menu-for]")).toBeFocused();
});

test("hover switches submenu branches at the same depth", async ({ page }) => {
  await page.locator("#menu-fixture button[data-menu-for]").click();
  const menu = page.locator("#fixture-menu");
  await menu.getByRole("menuitem", { name: "More" }).hover();
  await expect(menu.locator("#fixture-sub-one")).toBeVisible();
  await menu.getByRole("menuitem", { name: "Other", exact: true }).hover();
  await expect(menu.locator("#fixture-sub-other")).toBeVisible();
  await expect(menu.locator("#fixture-sub-one")).not.toBeVisible();
});

test("point opening and nested popovers stay in the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 320 });
  await page.locator("#fixture-menu").evaluate((menu: any) => {
    menu.openFor(document.querySelector("#menu-fixture [data-context-id=row-b]"), { x: 390, y: 310 });
  });
  const root = await page.locator("#fixture-menu").boundingBox();
  expect(root).not.toBeNull();
  expect(root!.x + root!.width).toBeLessThanOrEqual(400);
  expect(root!.y + root!.height).toBeLessThanOrEqual(320);
  await page.locator("#fixture-menu [data-submenu=fixture-sub-one]").click();
  if (await page.evaluate(() => CSS.supports("position-anchor: --rocket-menu-anchor")))
    await expect(page.locator("#fixture-menu #fixture-sub-one")).toHaveCSS("position-anchor", /--rocket-menu-anchor-/);
  const sub = await page.locator("#fixture-menu #fixture-sub-one").boundingBox();
  expect(sub).not.toBeNull();
  expect(sub!.x + sub!.width).toBeLessThanOrEqual(400);
  expect(sub!.y + sub!.height).toBeLessThanOrEqual(320);
});

test("CSS anchors position button and pointer menus and are cleaned up", async ({ page }) => {
  const supported = await page.evaluate(() => CSS.supports("position-anchor: --rocket-menu-anchor"));
  if (!supported) return;
  const menu = page.locator("#fixture-menu");
  const button = page.locator("#menu-fixture button[data-menu-for]");
  await button.click();
  await expect(menu).toHaveCSS("position-anchor", /--rocket-menu-anchor-/);
  await expect(button).toHaveCSS("anchor-name", /--rocket-menu-anchor-/);
  await page.keyboard.press("Escape");
  await expect(button).toHaveCSS("anchor-name", "none");
  await page.locator("#menu-fixture [data-context-id=row-b]").click({ button: "right" });
  await expect(menu).toHaveCSS("position-anchor", /--rocket-menu-anchor-/);
  await expect(page.locator("body > span[aria-hidden=true]")).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(page.locator("body > span[aria-hidden=true]")).toHaveCount(0);
});

test("host-level shortcuts override menu navigation", async ({ page }) => {
  await page.goto("/?keyboard=menu");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await page.keyboard.press("ArrowDown");
  await expect(page.locator("#fixture-menu")).toBeFocused();
  await page.keyboard.press("n");
  await expect(page.locator("#fixture-menu [data-action=view]")).toBeFocused();
  await page.keyboard.press("n");
  await expect(page.locator("#fixture-menu [data-action=label]")).toBeFocused();
});

test("keyboard starts at the first item, goes up from the menu, and returns through each submenu", async ({ page }) => {
  const menu = page.locator("#fixture-menu");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await expect(menu).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem", { name: "Other", exact: true })).toBeFocused();
  await page.keyboard.press("Home");
  await expect(menu.getByRole("menuitem", { name: "View row-a" })).toBeFocused();
  await page.keyboard.press("End");
  await page.keyboard.press("ArrowUp");
  await expect(menu.getByRole("menuitem", { name: "More" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(menu.locator("#fixture-sub-one")).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Copy" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowRight");
  await expect(menu.locator("#fixture-sub-two")).toBeFocused();
  await page.keyboard.press("Backspace");
  await expect(menu.getByRole("menuitem", { name: "Advanced" })).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(menu.getByRole("menuitem", { name: "More" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
});

test("Enter on a newly opened menu activates its first action", async ({ page }) => {
  const menu = page.locator("#fixture-menu");
  await page.evaluate(() => {
    (window as any).__actions = [];
    document.querySelector("#fixture-menu")!.addEventListener("rocket-menu-action", (event) => {
      (window as any).__actions.push((event as CustomEvent).detail);
    });
  });
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await expect(menu).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).not.toBeVisible();
  expect(await page.evaluate(() => (window as any).__actions)).toEqual([{ action: "view", contextId: "row-a" }]);
});

test("hover-opened submenu leaves keyboard navigation in the focused level", async ({ page }) => {
  const menu = page.locator("#fixture-menu");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await page.keyboard.press("ArrowDown");
  await menu.getByRole("menuitem", { name: "More" }).hover();
  await expect(menu.locator("#fixture-sub-one")).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Label" })).toBeFocused();
  await expect(menu.locator("#fixture-sub-one")).not.toBeVisible();
});

test("macOS Control-N/P navigate the menu without taking Command shortcuts", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "platform", { configurable: true, value: "MacIntel" }),
  );
  await page.reload();
  const menu = page.locator("#fixture-menu");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await page.keyboard.press("Control+n");
  await expect(menu.getByRole("menuitem", { name: "View row-a" })).toBeFocused();
  await page.keyboard.press("Control+p");
  await expect(menu.getByRole("menuitem", { name: "Other", exact: true })).toBeFocused();
  const commandPrevented = await menu.evaluate((host) => {
    const event = new KeyboardEvent("keydown", { key: "p", metaKey: true, bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(commandPrevented).toBe(false);
});

test("control-letter shortcuts remain opt-in outside macOS", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "platform", { configurable: true, value: "Linux x86_64" }),
  );
  await page.reload();
  const menu = page.locator("#fixture-menu");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  const defaultPrevented = await menu.evaluate((host) => {
    const event = new KeyboardEvent("keydown", { key: "p", ctrlKey: true, bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(defaultPrevented).toBe(false);
  await page.goto("/?keyboard=menu-emacs");
  await page.locator("#menu-fixture button[data-menu-for]").click();
  const optedIn = await page.locator("#fixture-menu").evaluate((host) => {
    const event = new KeyboardEvent("keydown", { key: "n", ctrlKey: true, bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    return event.defaultPrevented;
  });
  expect(optedIn).toBe(true);
  await expect(page.locator("#fixture-menu [data-action=view]")).toBeFocused();
});

test("a server morph without runtime attributes cannot break the next open", async ({ page }) => {
  const menu = page.locator("#fixture-menu");
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await menu.getByRole("menuitem", { name: "View row-a" }).click();
  await menu.evaluate((host) => {
    host.removeAttribute("popover");
    host.removeAttribute("role");
  });
  await page.locator("#menu-fixture button[data-menu-for]").click();
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("popover", "auto");
  await expect(menu).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "View row-a" })).toBeFocused();
  expect(errors).toEqual([]);
});

test("a fetched live menu preserves server markup and exposes scope and close hooks", async ({ page }) => {
  const menu = page.locator("#live-menu");
  await page.evaluate(() => {
    (window as any).__menuScopes = [];
    document.querySelector("#live-menu")!.addEventListener("rocket-menu-scope", (event) => {
      const detail = (event as CustomEvent).detail;
      (window as any).__menuScopes.push({ active: detail.active, root: detail.root.id });
    });
  });
  await page.locator('a[data-menu-for="live-menu"]').click();
  await expect(menu).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await expect(menu.getByRole("menuitem", { name: "Server-rendered row-b" })).toBeFocused();
  await menu.evaluate((host: any) => host.closeMenu(true));
  await expect(menu).not.toBeVisible();
  await expect(menu.locator(":scope > [data-rocket-menu-content]")).toHaveCount(1);
  expect(await menu.evaluate((host: any) => host.isOpen())).toBe(false);
  expect(await page.evaluate(() => (window as any).__menuScopes)).toEqual([
    { active: true, root: "live-menu" },
    { active: false, root: "live-menu" },
  ]);
  await page.locator('a[data-menu-for="live-menu"]').click();
  await expect(menu).toBeFocused();
  expect(await menu.evaluate((host: any) => host.isOpen())).toBe(true);
});

test("a freshly installed live fragment emits actions for the current trigger", async ({ page }) => {
  await page.evaluate(() => {
    (window as any).__liveActions = [];
    const menu = document.querySelector("#live-menu")!;
    menu.addEventListener("rocket-menu-action", (event) =>
      (window as any).__liveActions.push((event as CustomEvent).detail),
    );
    menu.querySelector("[data-rocket-menu-content]")!.innerHTML =
      '<button type="button" role="menuitem" data-action="inspect">Fresh action</button>';
  });
  await page.locator('a[data-menu-for="live-menu"]').click();
  await page.locator("#live-menu").getByRole("menuitem", { name: "Fresh action" }).click();
  expect(await page.evaluate(() => (window as any).__liveActions)).toEqual([
    { action: "inspect", contextId: "live-row" },
  ]);
  await expect(page.locator("#live-menu [data-rocket-menu-content]")).toContainText("Fresh action");
  await expect(page.locator('a[data-menu-for="live-menu"]')).toBeFocused();
});

test("installer opens server-owned inline content, handles nested focus and disposal", async ({ page }) => {
  await page.evaluate(async () => {
    const { installContextMenu } = (await new Function('return import("/rocket-kit.js")')()) as {
      installContextMenu: (host: HTMLElement, cleanup: (fn: () => void) => void, options: object) => void;
    };
    const host = document.createElement("section") as any;
    host.innerHTML =
      '<button role="menuitem" data-submenu="inline-sub">More</button><div id="inline-sub" role="menu"><button role="menuitem" data-action="choose">Choose</button></div>';
    document.body.append(host);
    (window as any).__inlineMenu = host;
    installContextMenu(host, (dispose: () => void) => ((window as any).__disposeInlineMenu = dispose), {
      inlineContent: true,
      captureTriggers: false,
      focusFirst: true,
    });
    host.openFor(document.querySelector("#menu-fixture button"));
  });
  const host = page.locator("section:has(#inline-sub)");
  await expect(host.getByRole("menuitem", { name: "More" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(host.getByRole("menuitem", { name: "Choose" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(host.getByRole("menuitem", { name: "More" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect.poll(() => host.evaluate((menu) => menu.matches(":popover-open"))).toBe(false);
  await host.evaluate(() => (window as any).__disposeInlineMenu());
});
