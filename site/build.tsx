import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { KanbanBoard } from "../examples/hono-datastar/adapter/kanban";
import { DragGroup } from "../examples/hono-datastar/adapter/drag-group";
import { BentoWorkspace } from "../examples/hono-datastar/adapter/bento";
import type { DatastarEventBinding } from "../examples/hono-datastar/adapter/event-binding";
import { renderHTML } from "../examples/hono-datastar/adapter/render";
import { SortableList } from "../examples/hono-datastar/adapter/sortable-list";
import { kanbanContract } from "../contracts/kanban";
import { sortableListContract } from "../contracts/sortable-list";
import { dragGroupContract } from "../contracts/drag-group";
import { bentoContract } from "../contracts/bento";
import fixture from "../examples/hono-datastar/fixture.json";
import { buildSourceIndex } from "./build-source";

const root = join(import.meta.dir, "..");
const output = join(root, "dist/site");
const bundle = await readFile(join(root, "dist/rocket-kit.js"), "utf8");
const assetVersion = createHash("sha256")
  .update(bundle)
  .update(await readFile(join(import.meta.dir, "fake-backend.ts")))
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

const page = renderHTML(
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>PD rockets · guide and reference</title>
      <meta
        name="description"
        content="PD rockets: reusable Rocket components, starting with drag-and-drop for Kanban and sortable lists."
      />
      <link rel="stylesheet" href={`./demo.css?v=${assetVersion}`} />
      <link rel="stylesheet" href={`./site.css?v=${assetVersion}`} />
    </head>
    <body data-signals='{"cardId":"","col":0,"before":"","itemId":"","fromList":"","toList":"","bento":{}}'>
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
                <a href="#bento">05 · Bento grids</a>
                <a href="#server">06 · Wire a backend</a>
                <a href="#reference">Reference</a>
                <a href="#keyboard">Keyboard inputs</a>
                <a href="#events">Events &amp; DOM</a>
                <a href="#next">What's next</a>
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
                  Build the browser code and serve it alongside the open-source Datastar + Rocket bundle. Render the
                  custom-element tags and data attributes from any backend; Hono JSX and Go examples are included.
                </p>
                <pre>
                  <code>{`bun install
bun run build:client
# copy dist/rocket-kit.js into your application
# serve public/js/datastar-rocket.js at /js/datastar-rocket.js`}</code>
                </pre>
                <p>
                  <a href="./source/build-client.ts.txt">Client build source ↗</a> ·{" "}
                  <a href="./rocket-kit.js">Built client bundle ↗</a> ·{" "}
                  <a href="./js/DATASTAR-LICENSE.md">Upstream MIT notice ↗</a>
                </p>
                <p class="callout">
                  The included{" "}
                  <a href="./js/datastar-rocket.js">
                    <code>datastar-rocket.js</code>
                  </a>{" "}
                  bundle contains both Datastar and Rocket. Load it once; there is no separate Pro runtime. See the{" "}
                  <a href="https://data-star.dev/reference/rocket">official Rocket reference</a> for its API.
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
                  perform a mutation. Use <kbd>Alt</kbd>+<kbd>h</kbd>/<kbd>j</kbd>/<kbd>k</kbd>/<kbd>l</kbd> to stage
                  keyboard moves, then release Alt to commit.
                </p>
                <div class="example-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / KANBAN{" "}
                    <span>drag or use Alt + arrows</span>
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
                  event. Drag above or below an item to insert at that position. The list demo does not define keyboard
                  reordering; its items remain focusable.
                </p>
                <div class="example-frame list-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / SORTABLE <span>drag onto an item</span>
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
                  own drag scope; the page decides how to apply the emitted move. Focus an item and use Alt + arrows (or
                  h/j/k/l), then release Alt to commit. Escape cancels the staged move.
                </p>
                <div class="example-frame group-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / DRAG GROUP <span>drag between lists</span>
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

              <section id="bento" class="docs-section" aria-labelledby="bento-title">
                <p class="section-kicker">STEP 05 / LIVE EXAMPLE</p>
                <h2 id="bento-title">Bento grids</h2>
                <p>
                  Two CSS grids share one drag scope. Drop a tile on a cell in either grid, or use its ↘ handle to
                  resize it. A two-dimensional placement rule pushes overlapping tiles down when the backend returns the
                  new layout. Focus a tile: Alt + arrows move it by a cell, Alt + Page Up/Down switches grids, and Shift
                  + arrows resize. Release the modifier to commit; Escape cancels.
                </p>
                <div class="example-frame bento-frame">
                  <div class="example-head">
                    <span class="live-dot" aria-hidden="true"></span> LIVE / BENTO{" "}
                    <span>drag between grids or resize ↘</span>
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

rocket-bento-move → { itemId, fromGrid, toGrid, col, row, width, height }
rocket-bento-resize → { itemId, grid, width, height }`}</code>
                </pre>
                <p>
                  <a href="./source/rocket/bento/client.ts.txt">Bento Rocket source ↗</a> ·{" "}
                  <a href="./source/rocket/bento/placement.ts.txt">Placement rule ↗</a> ·{" "}
                  <a href="./source/examples/hono-datastar/adapter/bento.tsx.txt">JSX template ↗</a>
                </p>
              </section>

              <section id="server" class="docs-section" aria-labelledby="server-title">
                <p class="section-kicker">STEP 06 / SERVER HANDOFF</p>
                <h2 id="server-title">Server round trip</h2>
                <p>
                  Bind each semantic event to a Datastar action in your page. Your server handler validates the target,
                  updates authoritative state, and sends complete HTML over SSE. On this page, a site-only fetch shim
                  stands in for that handler and returns a{" "}
                  <a href="./source/site/fake-backend.ts.txt">
                    <code>datastar-patch-elements</code>
                  </a>{" "}
                  event. Datastar performs the morph; Rocket animates items from their prior positions to the new ones.
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
                  The page seeds only move-detail signals. Board and list content live in rendered DOM, not signals.
                </p>
              </section>

              <section id="reference" class="docs-section reference-section" aria-labelledby="reference-title">
                <p class="section-kicker">QUICK REFERENCE / 02</p>
                <h2 id="reference-title">Reference</h2>
                <p>
                  These are browser-facing contracts. Action bindings, permissions and transport configuration belong to
                  the consuming application.
                </p>
                <h3 id="keyboard">Kanban keyboard attributes</h3>
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
                  . Defaults come from{" "}
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

              <section id="next" class="docs-section" aria-labelledby="next-title">
                <p class="section-kicker">ON THE HORIZON / 03</p>
                <h2 id="next-title">What's next</h2>
                <p>
                  Drag groups, Kanban, sortable lists and bento grids now exercise different target geometry. A sortable
                  tree is a useful next pressure test for nested targets. Each surface can share core mechanics without
                  pretending every layout is the same component.
                </p>
                <div class="layer-strip future-strip" aria-label="Other drag-and-drop surfaces">
                  <span>
                    <b>
                      <a href="#bento">Bento grid</a>
                    </b>
                    <small>two-dimensional placement · live example</small>
                  </span>
                  <span>
                    <b>Sortable tree</b>
                    <small>nested targets · planned</small>
                  </span>
                </div>
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
      <script type="module" src={`./fake-backend.js?v=${assetVersion}`}></script>
      <script type="module" src={`./rocket-kit.js?v=${assetVersion}`}></script>
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

await writeFile(
  join(output, "rocket-kit.js"),
  bundle.replaceAll('"/js/datastar-rocket.js"', '"./js/datastar-rocket.js"'),
);

const fakeBackend = await Bun.build({ entrypoints: [join(import.meta.dir, "fake-backend.ts")], target: "browser" });
if (!fakeBackend.success || fakeBackend.outputs.length !== 1 || !fakeBackend.outputs[0]) {
  throw new AggregateError(fakeBackend.logs, "rocket-kit: site fake backend build failed");
}
await Bun.write(join(output, "fake-backend.js"), fakeBackend.outputs[0]);

console.error(`built ${join(output, "index.html")}`);
