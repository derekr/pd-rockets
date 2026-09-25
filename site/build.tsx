import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { KanbanBoard } from "../examples/hono-datastar/adapter/kanban";
import { DragGroup } from "../examples/hono-datastar/adapter/drag-group";
import { BentoWorkspace } from "../examples/hono-datastar/adapter/bento";
import type { DatastarEventBinding } from "../examples/hono-datastar/adapter/event-binding";
import { renderHTML } from "../examples/hono-datastar/adapter/render";
import { SortableList } from "../examples/hono-datastar/adapter/sortable-list";
import { SortableTree, type FileNode } from "../examples/hono-datastar/adapter/sortable-tree";
import { kanbanContract } from "../contracts/kanban";
import { sortableListContract } from "../contracts/sortable-list";
import { dragGroupContract } from "../contracts/drag-group";
import { bentoContract } from "../contracts/bento";
import { sortableTreeContract } from "../contracts/sortable-tree";
import fixture from "../examples/hono-datastar/fixture.json";
import { buildSourceIndex } from "./build-source";
import { ensureRuntime } from "../scripts/fetch-datastar-rocket";
import { browserBundles, rocketModule } from "../browser-bundles";

const root = join(import.meta.dir, "..");
const output = join(root, "dist/site");
await ensureRuntime();
const bundle = await readFile(join(root, "dist/rocket-kit.js"), "utf8");
const bundleSizes = new Map(
  await Promise.all(
    browserBundles.map(async ({ file }) => [file, (await stat(join(root, "dist", `${file}.br`))).size] as const),
  ),
);
const fakeBackend = await Bun.build({ entrypoints: [join(import.meta.dir, "fake-backend.ts")], target: "browser" });
if (!fakeBackend.success || fakeBackend.outputs.length !== 1 || !fakeBackend.outputs[0]) {
  throw new AggregateError(fakeBackend.logs, "rocket-kit: site fake backend build failed");
}
const backendBundle = await fakeBackend.outputs[0].text();
const keyboardHelpBundle = await Bun.build({
  entrypoints: [join(import.meta.dir, "keyboard-help.ts")],
  target: "browser",
  minify: true,
});
if (!keyboardHelpBundle.success || !keyboardHelpBundle.outputs[0]) {
  throw new AggregateError(keyboardHelpBundle.logs, "rocket-kit: keyboard help build failed");
}
const keyboardHelp = await keyboardHelpBundle.outputs[0].text();
const assetVersion = createHash("sha256")
  .update(bundle)
  .update(backendBundle)
  .update(keyboardHelp)
  .update(await readFile(join(import.meta.dir, "site.css")))
  .update(await readFile(join(root, "examples/hono-datastar/demo.css")))
  .digest("hex")
  .slice(0, 12);

const kanbanMove: DatastarEventBinding = {
  event: kanbanContract.events.move,
  attrs: {
    "data-on:rocket-kanban-move":
      "$cardId = evt.detail?.['cardId'] ?? null; $col = evt.detail?.['col'] ?? null; $before = evt.detail?.['before'] ?? null; @post('./move')",
  },
};

const sortableMove: DatastarEventBinding = {
  event: sortableListContract.events.move,
  attrs: {
    "data-on:rocket-sortable-move":
      "$itemId = evt.detail?.['itemId'] ?? null; $before = evt.detail?.['before'] ?? null; @post('./list-move')",
  },
};

const groupMove: DatastarEventBinding = {
  event: dragGroupContract.events.move,
  attrs: {
    "data-on:rocket-drag-group-move":
      "$itemId = evt.detail?.['itemId'] ?? null; $fromList = evt.detail?.['fromList'] ?? null; $toList = evt.detail?.['toList'] ?? null; $before = evt.detail?.['before'] ?? null; @post('./group-move')",
  },
};

const bentoMove: DatastarEventBinding = {
  event: bentoContract.events.move,
  attrs: { "data-on:rocket-bento-move": "$bento = evt.detail; @post('./bento-move')" },
};
const bentoResize: DatastarEventBinding = {
  event: bentoContract.events.resize,
  attrs: { "data-on:rocket-bento-resize": "$bento = evt.detail; @post('./bento-resize')" },
};
const treeMove: DatastarEventBinding = {
  event: sortableTreeContract.events.move,
  attrs: { "data-on:rocket-tree-move": "$tree = evt.detail; @post('./tree-move')" },
};
const nestedGroupMove: DatastarEventBinding = {
  event: dragGroupContract.events.move,
  attrs: {
    "data-on:rocket-drag-group-move":
      "$itemId = evt.detail?.['itemId'] ?? null; $fromList = evt.detail?.['fromList'] ?? null; $toList = evt.detail?.['toList'] ?? null; $before = evt.detail?.['before'] ?? null; @post('./nested-group-move')",
  },
};
const nestedListMove: DatastarEventBinding = {
  event: sortableListContract.events.move,
  attrs: {
    "data-on:rocket-sortable-move":
      "$itemId = evt.detail?.['itemId'] ?? null; $before = evt.detail?.['before'] ?? null; @post('./nested-list-move')",
  },
};

type Shortcut = { keys: string; action: string };

function KeyboardHelp({ id, title, shortcuts }: { id: string; title: string; shortcuts: readonly Shortcut[] }) {
  return (
    <>
      <button
        class="keyboard-help-trigger"
        type="button"
        popovertarget={id}
        aria-label={`Keyboard shortcuts for ${title}`}
        style={`anchor-name: --${id}`}
      >
        ?
      </button>
      <div
        id={id}
        class="keyboard-help-popover"
        popover="auto"
        style={`position-anchor: --${id}`}
        aria-labelledby={`${id}-title`}
      >
        <h3 id={`${id}-title`}>{title} shortcuts</h3>
        <p>Focus an item first.</p>
        <dl>
          {shortcuts.map(({ keys, action }) => (
            <div>
              <dt>
                <kbd>{keys}</kbd>
              </dt>
              <dd>{action}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}

const page = renderHTML(
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>PD rockets · guide and reference</title>
      <meta
        name="description"
        content="PD rockets: vendorable Rocket drag-and-drop components for Kanban boards, sortable lists, drag groups, bento grids, and file trees."
      />
      <link rel="stylesheet" href={`./demo.css?v=${assetVersion}`} />
      <link rel="stylesheet" href={`./site.css?v=${assetVersion}`} />
      <script
        type="importmap"
        dangerouslySetInnerHTML={{ __html: JSON.stringify({ imports: { [rocketModule]: "./js/datastar-rocket.js" } }) }}
      />
    </head>
    <body data-signals='{"cardId":"","col":0,"before":"","itemId":"","fromList":"","toList":"","bento":{},"tree":{}}'>
      <div class="site-frame">
        <header class="site-header">
          <a class="brand" href="#top" aria-label="PD rockets, back to top">
            <span class="brand-mark">PD</span> PD rockets
          </a>
          <nav aria-label="Page navigation">
            <a href="#guide">Guide</a>
            <a href="#reference">Reference</a>
            <a href="#examples">Examples</a>
            <a href="#try-it">Run locally</a>
          </nav>
        </header>

        <main id="top" class="docs-shell">
          <div class="hero">
            <div class="hero-copy">
              <p class="eyebrow">Rocket components · drag &amp; drop first</p>
              <h1>
                Drag-and-drop for
                <br />
                <em>server-rendered pages.</em>
              </h1>
              <p class="hero-lead">
                PD rockets is a collection of vendorable Rocket components. Drag-and-drop is the first family: your
                backend renders the items, a custom element handles the gesture, and your application decides what the
                emitted event means.
              </p>
              <div class="hero-actions">
                <a class="button-link" href="#guide">
                  Follow the guide <span aria-hidden="true">↗</span>
                </a>
                <a class="text-link" href="#reference">
                  Browse the contract ↓
                </a>
              </div>
            </div>
            <aside class="hero-diagram" aria-label="Interaction flow">
              <span class="diagram-label">THE ROUND TRIP</span>
              <ol>
                <li>
                  <b>01</b>
                  <span>Server renders DOM</span>
                </li>
                <li>
                  <b>02</b>
                  <span>Rocket emits intent</span>
                </li>
                <li>
                  <b>03</b>
                  <span>Backend returns HTML</span>
                </li>
              </ol>
              <p>Move the model. Morph the view. Let the browser handle the motion.</p>
            </aside>
          </div>

          <div class="docs-layout">
            <aside class="docs-sidebar">
              <nav aria-label="Documentation contents">
                <span class="sidebar-label">ON THIS PAGE</span>
                <a href="#guide">Guide</a>
                <a href="#install">01 · Get started</a>
                <a href="#kanban">02 · Kanban board</a>
                <a href="#sortable">03 · Sortable list</a>
                <a href="#drag-group">04 · Drag group</a>
                <a href="#nested">Nested hosts</a>
                <a href="#bento">05 · Bento grids</a>
                <a href="#tree">06 · File tree</a>
                <a href="#server">07 · Wire a backend</a>
                <a href="#reference">Reference</a>
                <a href="#keyboard">Keyboard inputs</a>
                <a href="#events">Events &amp; DOM</a>
                <a href="#examples">Examples</a>
                <a href="#try-it">Run locally</a>
              </nav>
            </aside>

            <div class="docs-content">
              <section id="guide" class="docs-section section-intro" aria-labelledby="guide-title">
                <p class="section-kicker">FIELD GUIDE / 01</p>
                <h2 id="guide-title">How it works</h2>
                <p>
                  The public contracts live in{" "}
                  <a href="./source/contracts/index.html">
                    <code>contracts/</code>
                  </a>
                  . Core owns pointer capture, the detached preview, target marking and post-move FLIP. The Rocket hosts
                  own DOM lookup and event emission. Neither layer knows which Datastar action your page will invoke or
                  how your backend stores changes.
                </p>
                <h3>Why Rocket?</h3>
                <p>
                  <a href="https://data-star.dev/reference/rocket">Rocket is Datastar’s web component API</a>. Here it
                  owns element setup and cleanup around browser-only work—pointer capture, hit testing, previews and
                  animation—while the backend stays responsible for rendering state. Semantic custom events let any page
                  connect those mechanics to its own Datastar actions. Rocket gives each instance a lifecycle and a
                  public DOM boundary without turning signals into a second application model.
                </p>
                <div class="layer-strip" aria-label="Library layers">
                  <span>
                    <b>
                      <a href="./source/contracts/index.html">contracts/</a>
                    </b>
                    <small>inputs &amp; outputs</small>
                  </span>
                  <span>
                    <b>
                      <a href="./source/core/index.html">core/</a>
                    </b>
                    <small>gesture &amp; motion</small>
                  </span>
                  <span>
                    <b>
                      <a href="./source/rocket/index.html">rocket/</a>
                    </b>
                    <small>host lifecycle</small>
                  </span>
                  <span>
                    <b>
                      <a href="./source/examples/index.html">examples/</a>
                    </b>
                    <small>server adapters</small>
                  </span>
                </div>
              </section>

              <section id="install" class="docs-section" aria-labelledby="install-title">
                <p class="section-kicker">STEP 01 / GET STARTED</p>
                <h2 id="install-title">Install</h2>
                <p>
                  Download the prebuilt release archive, then serve one surface bundle or the full kit alongside the
                  open-source Datastar + Rocket runtime. Each surface includes its own core dependencies; the core
                  bundle is also available for custom mechanics. Render the tags and data attributes from any backend.
                </p>
                <pre>
                  <code>{`mkdir -p public/js
curl -fsSL "https://github.com/<owner>/<repo>/releases/latest/download/pd-rockets-browser.tar.gz" | tar -xz -C public/js
# serve the upstream datastar-rocket.js at /js/datastar-rocket.js
<script type="importmap">{"imports":{"pd-rockets/rocket":"/js/datastar-rocket.js"}}</script>
# choose one of the following:
<script type="module" src="/js/rocket-sortable-tree.js"></script>
<script type="module" src="/js/rocket-kit.js"></script>`}</code>
                </pre>
                <p>
                  <a href="https://data-star.dev/reference/rocket#bundle">Get the Rocket runtime ↗</a> ·{" "}
                  <a href="./js/DATASTAR-LICENSE.md">Upstream MIT notice ↗</a>
                </p>
                <p>
                  The import map resolves <code>pd-rockets/rocket</code> to the pinned upstream module. If your page
                  supplies a separate Rocket ES module, map that specifier to its URL instead; it must export{" "}
                  <code>rocket</code> and use the same Datastar instance as the page. The guide uses the latest pinned
                  upstream Datastar + Rocket bundle (v1.0.4) with its MIT notice.
                </p>
                <ul class="bundle-links" aria-label="Prebuilt PD rockets bundles">
                  {browserBundles.map(({ file }) => (
                    <li>
                      <a href={`./downloads/${file}`} download={file}>
                        <code>{file}</code> ↓
                      </a>{" "}
                      <small>({(bundleSizes.get(file)! / 1000).toFixed(1)} kB br)</small>{" "}
                      <a
                        href={`./downloads/${file}.br`}
                        download={`${file}.br`}
                        aria-label={`Download ${file} precompressed with Brotli`}
                      >
                        .br ↓
                      </a>
                    </li>
                  ))}
                </ul>
                <p>
                  Sizes are Brotli-compressed kilobytes (1 kB = 1,000 bytes). Use the regular <code>.js</code> file in
                  script tags; the optional <code>.br</code> file is for servers configured to serve precompressed
                  JavaScript with <code>Content-Encoding: br</code>.
                </p>
                <p>
                  <a href="./LICENSE" download="LICENSE">
                    PD rockets license ↓
                  </a>
                </p>
              </section>

              <section id="kanban" class="docs-section" aria-labelledby="kanban-title">
                <p class="section-kicker">STEP 02 / LIVE EXAMPLE</p>
                <h2 id="kanban-title">Kanban board</h2>
                <p>
                  Each lane carries a numeric{" "}
                  <a href="./source/contracts/kanban.ts.txt">
                    <code>data-col</code>
                  </a>
                  ; cards carry stable IDs. Drag a card into another lane, or focus a card and press <kbd>Alt</kbd>+
                  <kbd>→</kbd>. The emitted event describes the target lane and the card to insert before; it does not
                  perform a mutation. Plain arrows navigate focus; use <kbd>Alt</kbd>+<kbd>h</kbd>/<kbd>j</kbd>/
                  <kbd>k</kbd>/<kbd>l</kbd> to stage keyboard moves, then release Alt to commit.
                </p>
                <div class="example-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / KANBAN{" "}
                    <div class="example-tools">
                      <span class="example-hint">drag or use Alt + arrows</span>
                      <KeyboardHelp
                        id="keys-kanban"
                        title="Kanban"
                        shortcuts={[
                          { keys: "↑ ↓ ← → / h j k l", action: "Focus cards within and between lanes" },
                          { keys: "Alt + ↑ ↓ ← → / h j k l", action: "Stage a card move" },
                          { keys: "Release Alt", action: "Commit the move" },
                          { keys: "Esc", action: "Cancel staging" },
                        ]}
                      />
                    </div>
                  </div>
                  <div id="kanban-demo" class="example-body">
                    <div class="kanban">
                      <KanbanBoard id="kanban-board" columns={fixture.columns} move={kanbanMove} />
                    </div>
                  </div>
                </div>
                <pre>
                  <code>{`<rocket-kanban-board>
  <section data-kanban-lane data-col="0">
    <div data-kanban-lane-cards>
      <article data-kanban-card="card-a" tabindex="0">
        <button data-kanban-card-main>Card title</button>
      </article>
    </div>
  </section>
</rocket-kanban-board>

rocket-kanban-move → { cardId, col, before }`}</code>
                </pre>
                <p>
                  <a href="./source/rocket/kanban/client.ts.txt">Kanban Rocket source ↗</a> ·{" "}
                  <a href="./source/examples/hono-datastar/adapter/kanban.tsx.txt">JSX template ↗</a>
                </p>
              </section>

              <section id="sortable" class="docs-section" aria-labelledby="sortable-title">
                <p class="section-kicker">STEP 03 / LIVE EXAMPLE</p>
                <h2 id="sortable-title">Sortable list</h2>
                <p>
                  A sortable list uses the shared pointer lifecycle but chooses its own target geometry and semantic
                  event. Drag above or below an item to insert at that position. Up/down arrows or j/k navigate focused
                  items; Home/End jump to the first or last item. Alt + up/down stages a reorder; release Alt to commit
                  or press Escape to cancel.
                </p>
                <div class="example-frame list-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / SORTABLE
                    <div class="example-tools">
                      <span class="example-hint">drag onto an item</span>
                      <KeyboardHelp
                        id="keys-list"
                        title="Sortable list"
                        shortcuts={[
                          { keys: "↑ ↓ / j k", action: "Focus previous or next item" },
                          { keys: "Home / End", action: "Focus first or last item" },
                          { keys: "Alt + ↑ ↓ / j k", action: "Stage a reorder" },
                          { keys: "Release Alt / Esc", action: "Commit / cancel the move" },
                        ]}
                      />
                    </div>
                  </div>
                  <div id="sortable-demo" class="example-body">
                    <SortableList items={fixture.list} move={sortableMove} />
                  </div>
                </div>
                <pre>
                  <code>{`<rocket-sortable-list>
  <div data-sortable-item="list-a" tabindex="0">First item</div>
  <div data-sortable-item="list-b" tabindex="0">Second item</div>
</rocket-sortable-list>

rocket-sortable-move → { itemId, before }`}</code>
                </pre>
                <p>
                  <a href="./source/rocket/sortable-list/client.ts.txt">Sortable Rocket source ↗</a> ·{" "}
                  <a href="./source/examples/hono-datastar/adapter/sortable-list.tsx.txt">JSX template ↗</a>
                </p>
              </section>

              <section id="drag-group" class="docs-section" aria-labelledby="drag-group-title">
                <p class="section-kicker">STEP 04 / LIVE EXAMPLE</p>
                <h2 id="drag-group-title">Move between lists</h2>
                <p>
                  A drag group coordinates several lists without assigning Kanban columns or card semantics. Move an
                  item within a list or into another list, including the space after its last item. Each group is its
                  own drag scope; the page decides how to apply the emitted move. Plain arrows move focus within and
                  between lists. Focus an item and use Alt + arrows (or h/j/k/l), then release Alt to commit. Escape
                  cancels the staged move.
                </p>
                <div class="example-frame group-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / DRAG GROUP
                    <div class="example-tools">
                      <span class="example-hint">drag between lists</span>
                      <KeyboardHelp
                        id="keys-group"
                        title="Drag group"
                        shortcuts={[
                          { keys: "↑ ↓ / k j", action: "Focus within a list" },
                          { keys: "← → / h l", action: "Focus a neighboring list" },
                          { keys: "Home / End", action: "Focus first or last item in a list" },
                          { keys: "Alt + ↑ ↓ ← → / h j k l", action: "Stage a move or change lists" },
                          { keys: "Release Alt / Esc", action: "Commit / cancel the move" },
                        ]}
                      />
                    </div>
                  </div>
                  <div id="group-demo" class="example-body">
                    <DragGroup lists={fixture.groups} move={groupMove} />
                  </div>
                </div>
                <pre>
                  <code>{`<rocket-drag-group>
  <section data-drop-list="inbox">
    <div data-drag-item="note-a" tabindex="0">Sketch a card</div>
  </section>
  <section data-drop-list="later"></section>
</rocket-drag-group>

rocket-drag-group-move → { itemId, fromList, toList, before }`}</code>
                </pre>
                <p>
                  <a href="./source/rocket/drag-group/client.ts.txt">Drag group Rocket source ↗</a> ·{" "}
                  <a href="./source/examples/hono-datastar/adapter/drag-group.tsx.txt">JSX template ↗</a>
                </p>
              </section>

              <section id="nested" class="docs-section" aria-labelledby="nested-title">
                <p class="section-kicker">COMPOSITION / LIVE EXAMPLE</p>
                <h2 id="nested-title">Nested Rockets</h2>
                <p>
                  A sortable list sits inside an item of a drag group. Drag or use Alt + arrows on an inner item to
                  reorder only that list; drag the outer item to move the whole group item. Each host emits its own
                  event, and the page patches the matching example over SSE. Semantic events still bubble; when nesting
                  two hosts of the same surface, the page should check the event target before invoking an outer action.
                </p>
                <div class="example-frame nested-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / NESTED HOSTS
                    <div class="example-tools">
                      <KeyboardHelp
                        id="keys-nested"
                        title="Nested hosts"
                        shortcuts={[
                          { keys: "Tab", action: "Focus an outer item or an inner list item" },
                          { keys: "Outer: ↑ ↓ ← → / h j k l", action: "Navigate items and regions" },
                          { keys: "Outer: Alt + ↑ ↓ ← → / h j k l", action: "Move the whole outer item" },
                          { keys: "Inner: ↑ ↓ / j k", action: "Navigate inside the sortable list" },
                          { keys: "Inner: Alt + ↑ ↓ / j k", action: "Reorder only the inner list" },
                          { keys: "Release Alt / Esc", action: "Commit / cancel the move" },
                        ]}
                      />
                    </div>
                  </div>
                  <div id="nested-demo" class="example-body">
                    <rocket-drag-group {...nestedGroupMove.attrs}>
                      <section data-drop-list="nested-a" aria-label="First region">
                        <h3>First region</h3>
                        <div data-drag-item="outer-a" tabindex={0}>
                          <strong>Move this whole item</strong>
                          <SortableList
                            items={[
                              { id: "inner-a", label: "Inner A" },
                              { id: "inner-b", label: "Inner B" },
                            ]}
                            move={nestedListMove}
                          />
                        </div>
                        <div data-drag-item="outer-b" tabindex={0}>
                          Another outer item
                        </div>
                      </section>
                      <section data-drop-list="nested-b" aria-label="Second region">
                        <h3>Second region</h3>
                        <div data-drag-item="outer-c" tabindex={0}>
                          Destination item
                        </div>
                      </section>
                    </rocket-drag-group>
                  </div>
                </div>
                <p>
                  <a href="./source/core/ownership.ts.txt">Host ownership source ↗</a> ·{" "}
                  <a href="./source/core/pointer-drag.ts.txt">Pointer lifecycle ↗</a>
                </p>
              </section>

              <section id="bento" class="docs-section" aria-labelledby="bento-title">
                <p class="section-kicker">STEP 05 / LIVE EXAMPLE</p>
                <h2 id="bento-title">Bento grids</h2>
                <p>
                  Two CSS grids share one drag scope. Drop a tile on a cell in either grid, or use its ↘ handle to
                  resize it. Displaced tiles preview their new cells while you drag or resize. Rocket sends every
                  changed position on commit; the backend applies them and returns HTML. Plain arrows navigate tiles
                  within and across grids with arrows or h/j/k/l. Focus a tile: Alt + arrows move it by a cell and cross
                  a board boundary at an edge; Alt + Page Up/Down switches grids directly, and Shift + arrows resize.
                  Release the modifier to commit; Escape cancels.
                </p>
                <p>
                  The browser proposes positions for its live preview. The synthetic backend checks the complete
                  resulting grid for bounds and overlap before accepting them; a consuming backend validates its own
                  layout rules.
                </p>
                <div class="example-frame bento-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / BENTO{" "}
                    <div class="example-tools">
                      <span class="example-hint">drag between grids or resize ↘</span>
                      <KeyboardHelp
                        id="keys-bento"
                        title="Bento grids"
                        shortcuts={[
                          { keys: "↑ ↓ ← → / h j k l", action: "Focus tiles, including across grids" },
                          { keys: "Home / End", action: "Focus first or last tile" },
                          { keys: "Alt + ↑ ↓ ← → / h j k l", action: "Stage a tile move; cross at an edge" },
                          { keys: "Alt + Page Up / Down", action: "Move to the previous or next grid" },
                          { keys: "Shift + ↑ ↓ ← →", action: "Stage a resize" },
                          { keys: "Release modifier / Esc", action: "Commit / cancel the move" },
                        ]}
                      />
                    </div>
                  </div>
                  <div id="bento-demo" class="example-body">
                    <BentoWorkspace grids={fixture.bento} move={bentoMove} resize={bentoResize} />
                  </div>
                </div>
                <pre>
                  <code>{`<rocket-bento-workspace>
  <div data-bento-grid="overview" data-columns="4">
    <article data-bento-item="tile-a" data-bento-col="1" data-bento-row="1"
      data-bento-width="2" data-bento-height="2" tabindex="0">
      Traffic <button data-bento-resize aria-label="Resize Traffic">↘</button>
    </article>
  </div>
  <div data-bento-grid="scratchpad" data-columns="4"></div>
</rocket-bento-workspace>

rocket-bento-move → { itemId, fromGrid, toGrid, updates: [{ itemId, grid, col, row, width, height }] }
rocket-bento-resize → { itemId, grid, updates: [{ itemId, grid, col, row, width, height }] }`}</code>
                </pre>
                <p>
                  <a href="./source/rocket/bento/client.ts.txt">Bento Rocket source ↗</a> ·{" "}
                  <a href="./source/rocket/bento/placement.ts.txt">Placement rule ↗</a> ·{" "}
                  <a href="./source/examples/hono-datastar/adapter/bento.tsx.txt">JSX template ↗</a>
                </p>
              </section>

              <section id="tree" class="docs-section" aria-labelledby="tree-title">
                <p class="section-kicker">STEP 06 / LIVE EXAMPLE</p>
                <h2 id="tree-title">File tree</h2>
                <p>
                  Reorder files and folders, or drop onto a folder to move an entry inside it—even when it is empty.
                  Nested entries move with their folder. Plain up/down arrows (or j/k) navigate visible rows; right
                  expands or enters a folder, and left collapses it or returns to its parent. Focus a row: Alt + up/down
                  reorders among siblings, Alt + right moves it into the preceding folder, and Alt + left moves it out.
                  At the first or last child, Alt + up/down also moves it before or after the parent folder. Release Alt
                  to commit; Escape cancels.
                </p>
                <div class="example-frame tree-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / FILE TREE{" "}
                    <div class="example-tools">
                      <span class="example-hint">drag between directories</span>
                      <KeyboardHelp
                        id="keys-tree"
                        title="File tree"
                        shortcuts={[
                          { keys: "↑ ↓ / k j", action: "Focus visible rows" },
                          { keys: "→ / l, ← / h", action: "Expand or enter / collapse or leave a folder" },
                          { keys: "Home / End", action: "Focus first or last visible row" },
                          { keys: "Alt + ↑ ↓ / k j", action: "Reorder; cross out at a folder boundary" },
                          { keys: "Alt + → / l", action: "Move into the preceding folder" },
                          { keys: "Alt + ← / h", action: "Move out after the parent folder" },
                          { keys: "Release Alt / Esc", action: "Commit / cancel the move" },
                        ]}
                      />
                    </div>
                  </div>
                  <div id="tree-demo" class="example-body">
                    <SortableTree nodes={fixture.tree as FileNode[]} move={treeMove} />
                  </div>
                </div>
                <pre>
                  <code>{`<rocket-sortable-tree>
  <div data-tree-children data-tree-parent="">
    <div data-tree-node="src" data-tree-kind="folder">
      <div data-tree-row tabindex="0">src</div>
      <div data-tree-children data-tree-parent="src">…files…</div>
    </div>
  </div>
</rocket-sortable-tree>

rocket-tree-move → { itemId, fromParent, toParent, before }`}</code>
                </pre>
                <p>
                  <a href="./source/rocket/sortable-tree/client.ts.txt">Tree Rocket source ↗</a> ·{" "}
                  <a href="./source/examples/hono-datastar/adapter/sortable-tree.tsx.txt">JSX template ↗</a>
                </p>
              </section>

              <section id="server" class="docs-section" aria-labelledby="server-title">
                <p class="section-kicker">STEP 07 / SERVER HANDOFF</p>
                <h2 id="server-title">Server round trip</h2>
                <p>
                  Bind each semantic event to a Datastar action in your page. Your server handler validates the target,
                  updates authoritative state, and sends complete HTML over SSE. On this page, a site-only fetch shim
                  stands in for that handler and returns a{" "}
                  <a href="./source/site/fake-backend.ts.txt">
                    <code>datastar-patch-elements</code>
                  </a>{" "}
                  event. Datastar performs the morph; Rocket animates items from their prior positions to the new ones.
                  Try a demo gesture: the small activity queue shows the Rocket event, the Datastar POST and the SSE
                  patch returned by the fixture, without recording item text or request content.
                </p>
                <pre>
                  <code>{`event: datastar-patch-elements
data: selector #kanban-demo
data: mode outer
data: elements <div id="kanban-demo">…complete example…</div>`}</code>
                </pre>
                <p>
                  <a href="./source/site/fake-backend.ts.txt">Browser fixture source ↗</a> ·{" "}
                  <a href="./source/examples/go/main.go.txt">Go SSE handler ↗</a>
                </p>
                <p class="callout">
                  The page seeds only interaction-detail signals. Board, list and grid content live in rendered DOM, not
                  signals.
                </p>
              </section>

              <section id="reference" class="docs-section reference-section" aria-labelledby="reference-title">
                <p class="section-kicker">QUICK REFERENCE / 02</p>
                <h2 id="reference-title">Reference</h2>
                <p>
                  These are browser-facing contracts. Action bindings, permissions and transport configuration belong to
                  the consuming application.
                </p>
                <p>
                  All surfaces support unmodified arrow-key focus navigation; list, group, grid and tree surfaces also
                  support Home/End. Alt + arrows stage moves, where supported, without changing focus until the morph.
                </p>
                <h3 id="keyboard">Keyboard attributes</h3>
                <p>
                  Every host accepts space-separated <code>data-key-&lt;intent&gt;</code> bindings; an empty attribute
                  disables that intent. Focus intents are <code>focus-next</code>, <code>focus-previous</code>,
                  <code>focus-left</code>, <code>focus-right</code>, <code>focus-first</code> and{" "}
                  <code>focus-last</code>; movement uses <code>move-up/down/left/right</code> and <code>cancel</code>.
                  Each surface uses only its applicable directions. Bento also accepts{" "}
                  <code>resize-up/down/left/right</code> and
                  <code>grid-previous/next</code>. The shared defaults are in{" "}
                  <a href="./source/core/keyboard.ts.txt">core/keyboard.ts</a>.
                </p>
                <p>
                  Kanban also accepts the original <code>data-key-select-*</code> aliases below; a corresponding{" "}
                  <code>data-key-focus-*</code> takes precedence.
                </p>
                <div class="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Attribute</th>
                        <th>Default</th>
                        <th>Purpose</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-select-next</code>
                          </a>
                        </td>
                        <td>
                          <kbd>↓</kbd> / <kbd>j</kbd>
                        </td>
                        <td>Focus next card</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-select-previous</code>
                          </a>
                        </td>
                        <td>
                          <kbd>↑</kbd> / <kbd>k</kbd>
                        </td>
                        <td>Focus previous card</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-select-left</code>
                          </a>
                        </td>
                        <td>
                          <kbd>←</kbd> / <kbd>h</kbd>
                        </td>
                        <td>Focus card in previous lane</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-select-right</code>
                          </a>
                        </td>
                        <td>
                          <kbd>→</kbd> / <kbd>l</kbd>
                        </td>
                        <td>Focus card in next lane</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-move-up</code>
                          </a>
                        </td>
                        <td>
                          Alt + <kbd>↑</kbd> / <kbd>k</kbd>
                        </td>
                        <td>Move above previous card</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-move-down</code>
                          </a>
                        </td>
                        <td>
                          Alt + <kbd>↓</kbd> / <kbd>j</kbd>
                        </td>
                        <td>Move below next card</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-move-left</code>
                          </a>
                        </td>
                        <td>
                          Alt + <kbd>←</kbd> / <kbd>h</kbd>
                        </td>
                        <td>Move to previous lane</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-move-right</code>
                          </a>
                        </td>
                        <td>
                          Alt + <kbd>→</kbd> / <kbd>l</kbd>
                        </td>
                        <td>Move to next lane</td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>data-key-cancel</code>
                          </a>
                        </td>
                        <td>
                          <kbd>Esc</kbd>
                        </td>
                        <td>Clear target marks</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  Override a slot with space-separated key tokens, e.g.{" "}
                  <a href="./source/contracts/kanban.ts.txt">
                    <code>data-key-select-next="ArrowDown j"</code>
                  </a>
                  . Kanban compatibility defaults come from{" "}
                  <a href="./source/contracts/kanban.ts.txt">
                    <code>contracts/kanban.ts</code>
                  </a>
                  .
                </p>
                <h3 id="events">DOM and events</h3>
                <div class="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Host</th>
                        <th>Descendants</th>
                        <th>Emitted event</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>
                          <a href="./source/rocket/kanban/client.ts.txt">
                            <code>rocket-kanban-board</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>[data-kanban-lane][data-col]</code>, <code>[data-kanban-card]</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>rocket-kanban-move</code>
                          </a>{" "}
                          <small>{`{ cardId, col, before }`}</small>
                          <br />
                          <a href="./source/contracts/kanban.ts.txt">
                            <code>rocket-kanban-select</code>
                          </a>{" "}
                          <small>{`{ cardId }`}</small>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/rocket/sortable-list/client.ts.txt">
                            <code>rocket-sortable-list</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/sortable-list.ts.txt">
                            <code>[data-sortable-item]</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/sortable-list.ts.txt">
                            <code>rocket-sortable-move</code>
                          </a>{" "}
                          <small>{`{ itemId, before }`}</small>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/rocket/drag-group/client.ts.txt">
                            <code>rocket-drag-group</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/drag-group.ts.txt">
                            <code>[data-drop-list]</code> + <code>[data-drag-item]</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/drag-group.ts.txt">
                            <code>rocket-drag-group-move</code>
                          </a>{" "}
                          <small>{`{ itemId, fromList, toList, before }`}</small>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/rocket/bento/client.ts.txt">
                            <code>rocket-bento-workspace</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/bento.ts.txt">
                            <code>[data-bento-grid]</code> + <code>[data-bento-item]</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/bento.ts.txt">
                            <code>rocket-bento-move</code> / <code>rocket-bento-resize</code>
                          </a>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <a href="./source/rocket/sortable-tree/client.ts.txt">
                            <code>rocket-sortable-tree</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/sortable-tree.ts.txt">
                            <code>[data-tree-node]</code> + <code>[data-tree-children]</code>
                          </a>
                        </td>
                        <td>
                          <a href="./source/contracts/sortable-tree.ts.txt">
                            <code>rocket-tree-move</code>
                          </a>{" "}
                          <small>{`{ itemId, fromParent, toParent, before }`}</small>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  Events bubble and cross the custom-element boundary.{" "}
                  <a href="./source/core/insertion-target.ts.txt">
                    <code>before: ""</code>
                  </a>{" "}
                  means append. Keep IDs stable across renders so morph and FLIP can match items.
                </p>
              </section>

              <section id="examples" class="docs-section" aria-labelledby="examples-title">
                <p class="section-kicker">SERVER EXAMPLES / 04</p>
                <h2 id="examples-title">Contractual obligations</h2>
                <p>
                  The Hono JSX adapter packages the required markup and event binding into a component; this guide uses
                  it to send moves to its in-browser fixture. The Go example writes the same DOM with
                  <a href="./source/examples/go/main.go.txt">
                    <code>html/template</code>
                  </a>{" "}
                  and handles moves on the server. Your page chooses the Datastar action that receives each event.
                </p>
                <h3>Hono JSX</h3>
                <pre>
                  <code>{`const move = {
  event: "rocket-kanban-move",
  attrs: {
    "data-on:rocket-kanban-move":
      "$cardId = evt.detail?.['cardId'] ?? null; " +
      "$col = evt.detail?.['col'] ?? null; " +
      "$before = evt.detail?.['before'] ?? null; @post('/move')",
  },
};

<KanbanBoard id="kanban-board" columns={columns} move={move} />`}</code>
                </pre>
                <p>
                  <a href="./source/examples/hono-datastar/adapter/kanban.tsx.txt">View the JSX adapter source ↗</a>
                </p>
                <h3>Go template</h3>
                <pre>
                  <code>{`<rocket-kanban-board id="kanban-board"
   data-on:rocket-kanban-move="$cardId = evt.detail?.['cardId'] ?? null;
     $col = evt.detail?.['col'] ?? null;
     $before = evt.detail?.['before'] ?? null; @post('/move')">
  {{range .Columns}}
    <section data-kanban-lane="" data-col="{{.ID}}">
      <div data-kanban-lane-cards="">
        {{range .Cards}}
          <article data-kanban-card="{{.ID}}" tabindex="0">{{.Title}}</article>
        {{end}}
      </div>
    </section>
  {{end}}
</rocket-kanban-board>`}</code>
                </pre>
                <p>
                  <a href="./source/examples/go/main.go.txt">View the Go server source ↗</a>
                </p>
              </section>

              <section id="try-it" class="docs-section last-section" aria-labelledby="try-title">
                <p class="section-kicker">TAKE IT FURTHER / 05</p>
                <h2 id="try-title">Run locally</h2>
                <p>
                  The static docs use a browser-only fixture. The Hono JSX and Go examples show two server renderers for
                  the same contract.
                </p>
                <pre>
                  <code>{`# Static guide + in-browser SSE fixture
bun run serve:site

# Hono JSX demo
bun run demo

# Go demo (after bun run build:client)
cd examples/go && go run .`}</code>
                </pre>
                <p>
                  <a href="./source/site/serve.ts.txt">Site server source ↗</a> ·{" "}
                  <a href="./source/examples/hono-datastar/server.tsx.txt">Hono server source ↗</a> ·{" "}
                  <a href="./source/examples/go/main.go.txt">Go server source ↗</a>
                </p>
              </section>
            </div>
          </div>
        </main>
        <footer class="site-footer">
          <span>PD ROCKETS / VENDORABLE COMPONENTS</span>
          <a href="#top">Back to top ↑</a>
        </footer>
      </div>
      <aside
        id="demo-activity"
        class="demo-activity"
        aria-label="Demo activity"
        aria-live="polite"
        aria-relevant="additions"
      >
        <ol data-activity-queue=""></ol>
      </aside>
      <script type="module" src={`./fake-backend.js?v=${assetVersion}`}></script>
      <script type="module" src={`./rocket-kit.js?v=${assetVersion}`}></script>
      <script type="module" src={`./keyboard-help.js?v=${assetVersion}`}></script>
    </body>
  </html>,
);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await writeFile(join(output, "index.html"), `<!doctype html>${page}`);
await copyFile(join(root, "examples/hono-datastar/demo.css"), join(output, "demo.css"));
await copyFile(join(import.meta.dir, "site.css"), join(output, "site.css"));
await mkdir(join(output, "js"), { recursive: true });
await copyFile(join(root, "public/js/datastar-rocket.js"), join(output, "js/datastar-rocket.js"));
await copyFile(join(root, "public/js/DATASTAR-LICENSE.md"), join(output, "js/DATASTAR-LICENSE.md"));
await copyFile(join(root, "LICENSE"), join(output, "LICENSE"));
await buildSourceIndex(root, output, assetVersion);

await mkdir(join(output, "downloads"), { recursive: true });
for (const { file } of browserBundles) {
  const content = file === "rocket-kit.js" ? bundle : await readFile(join(root, "dist", file), "utf8");
  await writeFile(join(output, "downloads", file), content);
  await copyFile(join(root, "dist", `${file}.br`), join(output, "downloads", `${file}.br`));
  await writeFile(join(output, file), content);
}

await writeFile(join(output, "fake-backend.js"), backendBundle);
await writeFile(join(output, "keyboard-help.js"), keyboardHelp);

console.error(`built ${join(output, "index.html")}`);
