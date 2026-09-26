import { expect, test } from "@playwright/test";

test("pinned open-source Rocket dispatches newly scoped light-DOM issuers", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const runtime = (await new Function('return import("/js/datastar-rocket.js")')()) as {
      rocket: (tag: string, options: object) => void;
    };
    const host = document.createElement("rocket-scope-probe");
    host.id = "scope-probe";
    host.innerHTML = `<section><button id="initial" data-on:click="@scopeProbe('initial')">Initial</button></section>
      <section><button id="third" data-on:click="@scopeProbe('third')">Third</button></section>`;
    document.body.append(host);
    runtime.rocket("rocket-scope-probe", {
      mode: "light",
      setup({ action }: { action: (name: string, fn: (_ctx: unknown, id: string) => void) => void }) {
        action("scopeProbe", (_context, id) => document.getElementById(id)?.setAttribute("data-received", ""));
      },
    });
  });
  await page.evaluate(() => {
    const sections = document.querySelectorAll("#scope-probe section");
    sections[0]!.insertAdjacentHTML(
      "beforeend",
      `<button id="second" data-on:click="@scopeProbe('second')">Second</button>`,
    );
    sections[1]!.insertAdjacentHTML(
      "beforeend",
      `<button id="fourth" data-on:click="@scopeProbe('fourth')">Fourth</button>`,
    );
    document.querySelector("#scope-probe")!.dispatchEvent(new Event("datastar-scope-children"));
  });
  for (const id of ["initial", "second", "third", "fourth"]) {
    await page.locator(`#${id}`).click();
    await expect(page.locator(`#${id}`)).toHaveAttribute("data-received", "");
  }
});
