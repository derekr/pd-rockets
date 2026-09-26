import { join } from "node:path";
import { rocketModule } from "../../browser-bundles";
import { KanbanBoard } from "../../examples/hono-datastar/adapter/kanban";
import { DragGroup } from "../../examples/hono-datastar/adapter/drag-group";
import { SortableList } from "../../examples/hono-datastar/adapter/sortable-list";
import { BentoWorkspace } from "../../examples/hono-datastar/adapter/bento";
import { SortableTree, type FileNode } from "../../examples/hono-datastar/adapter/sortable-tree";
import { renderHTML } from "../../examples/hono-datastar/adapter/render";
import fixture from "../../examples/hono-datastar/fixture.json";
import { ensureRuntime } from "../../scripts/fetch-datastar-rocket";

await ensureRuntime();
const root = join(import.meta.dir, "../..");
const built = await Bun.build({
  entrypoints: [join(root, "client-entry.ts")],
  external: [rocketModule],
  target: "browser",
  minify: true,
});
if (!built.success || !built.outputs[0]) throw new AggregateError(built.logs, "browser harness build failed");
const bundle = await built.outputs[0].text();
const coreBuild = await Bun.build({ entrypoints: [join(root, "core/index.ts")], target: "browser" });
if (!coreBuild.success || !coreBuild.outputs[0]) throw new AggregateError(coreBuild.logs, "browser core build failed");
const coreBundle = await coreBuild.outputs[0].text();
const css = await Bun.file(join(root, "examples/hono-datastar/demo.css")).text();

const html = renderHTML(
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>Rocket keyboard harness</title>
      <link rel="stylesheet" href="/demo.css" />
      <style>{`body { max-width: 1050px; } .fixture { margin-block: 16px; } .fixture > h2 { margin: 0 0 8px; } rocket-context-menu, rocket-context-menu [role=menu] { margin: 0; min-width: 160px; padding: 8px; border: 1px solid currentColor; background: Canvas; } rocket-context-menu button { display: block; width: 100%; padding: 8px; }`}</style>
      <script
        type="importmap"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ imports: { [rocketModule]: "/js/datastar-rocket.js" } }) }}
      />
    </head>
    <body>
      <button id="outside" type="button">
        Outside
      </button>
      <input id="editor" aria-label="Editor" />
      <div class="fixture" id="kanban">
        <h2>Kanban</h2>
        <div class="kanban">
          <KanbanBoard columns={fixture.columns} />
        </div>
      </div>
      <div class="fixture" id="list">
        <h2>List</h2>
        <SortableList items={fixture.list} />
      </div>
      <div class="fixture" id="group">
        <h2>Group</h2>
        <DragGroup lists={fixture.groups} />
      </div>
      <div class="fixture" id="bento">
        <h2>Bento</h2>
        <BentoWorkspace grids={fixture.bento} />
      </div>
      <div class="fixture" id="tree">
        <h2>Tree</h2>
        <SortableTree nodes={fixture.tree as FileNode[]} />
      </div>
      <div class="fixture" id="nested">
        <h2>Nested</h2>
        <rocket-drag-group>
          <section data-drop-list="outer" aria-label="Outer list">
            <div data-drag-item="outer-a" tabindex={0}>
              Outer item
              <SortableList
                items={[
                  { id: "inner-a", label: "Inner A" },
                  { id: "inner-b", label: "Inner B" },
                ]}
              />
            </div>
          </section>
          <section data-drop-list="next" aria-label="Next list">
            <div data-drag-item="outer-b" tabindex={0}>
              Next item
            </div>
          </section>
        </rocket-drag-group>
      </div>
      <div class="fixture" id="menu-fixture">
        <h2>Context menu</h2>
        <div data-context-id="row-a" data-menu-for="fixture-menu" tabindex={0}>
          Row A{" "}
          <button type="button" data-menu-for="fixture-menu">
            Actions
          </button>
        </div>
        <div data-context-id="row-b" data-menu-for="fixture-menu" tabindex={0}>
          Row B
        </div>
        <rocket-context-menu id="fixture-menu">
          <template data-rocket-menu="">
            <button type="button" role="menuitem" data-action="view">
              View {"{contextId}"}
            </button>
            <button type="button" role="menuitem" data-action="label" data-menu-param-record="{contextId}">
              Label {"{label}"}
            </button>
            <button type="button" role="menuitem" data-submenu="fixture-sub-one" aria-haspopup="menu">
              More
            </button>
            <div id="fixture-sub-one" role="menu" popover="auto">
              <button type="button" role="menuitem" data-action="copy">
                Copy
              </button>
              <button type="button" role="menuitem" data-submenu="fixture-sub-two" aria-haspopup="menu">
                Advanced
              </button>
              <div id="fixture-sub-two" role="menu" popover="auto">
                <button type="button" role="menuitem" data-action="archive">
                  Archive
                </button>
              </div>
            </div>
            <button type="button" role="menuitem" data-submenu="fixture-sub-other" aria-haspopup="menu">
              Other
            </button>
            <div id="fixture-sub-other" role="menu" popover="auto">
              <button type="button" role="menuitem" data-action="other">
                Other action
              </button>
            </div>
          </template>
        </rocket-context-menu>
      </div>
      <div class="fixture" id="edit-fixture">
        <h2>Inline edit</h2>
        <rocket-inline-edit data-context-id="row-a">
          <span data-inline-edit-trigger="" data-inline-edit-value="">
            Original title
          </span>
          <input data-inline-edit-input="" value="Original title" aria-label="Edit title" />
        </rocket-inline-edit>
      </div>
      <script type="module" src="/rocket-kit.js"></script>
    </body>
  </html>,
);

Bun.serve({
  port: 4188,
  hostname: "127.0.0.1",
  fetch(request) {
    const path = new URL(request.url).pathname;
    if (path === "/") {
      const configured = new URL(request.url).searchParams.get("keyboard");
      const page =
        configured === "custom"
          ? html.replace(
              "<rocket-sortable-list",
              '<rocket-sortable-list data-key-focus-next="n" data-key-focus-previous="p"',
            )
          : configured === "disabled"
            ? html.replace("<rocket-sortable-list", '<rocket-sortable-list data-key-focus-next=""')
            : configured === "kanban"
              ? html.replace("<rocket-kanban-board", '<rocket-kanban-board data-key-focus-next="n"')
              : configured === "menu"
                ? html.replace(
                    '<rocket-context-menu id="fixture-menu"',
                    '<rocket-context-menu id="fixture-menu" data-key-focus-next="n"',
                  )
                : configured === "menu-emacs"
                  ? html.replace(
                      '<rocket-context-menu id="fixture-menu"',
                      '<rocket-context-menu id="fixture-menu" data-key-focus-next="ArrowDown Ctrl+n" data-key-focus-previous="ArrowUp Ctrl+p"',
                    )
                  : html;
      const mappedPage =
        new URL(request.url).searchParams.get("runtime") === "adapter"
          ? page.replace('"/js/datastar-rocket.js"', '"/js/rocket-adapter.js"')
          : page;
      return new Response(mappedPage, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    if (path === "/demo.css") return new Response(css, { headers: { "Content-Type": "text/css; charset=utf-8" } });
    if (path === "/rocket-kit.js")
      return new Response(bundle, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
    if (path === "/rocket-core.js")
      return new Response(coreBundle, { headers: { "Content-Type": "text/javascript; charset=utf-8" } });
    if (path === "/js/datastar-rocket.js")
      return new Response(Bun.file(join(root, "public/js/datastar-rocket.js")), {
        headers: { "Content-Type": "text/javascript; charset=utf-8" },
      });
    if (path === "/js/rocket-adapter.js")
      return new Response('export { rocket } from "/js/datastar-rocket.js";', {
        headers: { "Content-Type": "text/javascript; charset=utf-8" },
      });
    return new Response("Not found", { status: 404 });
  },
});
