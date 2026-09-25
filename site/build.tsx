import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { KanbanBoard } from "../examples/hono-datastar/adapter/kanban";
import { DragGroup } from "../examples/hono-datastar/adapter/drag-group";
import type { DatastarEventBinding } from "../examples/hono-datastar/adapter/event-binding";
import { renderHTML } from "../examples/hono-datastar/adapter/render";
import { SortableList } from "../examples/hono-datastar/adapter/sortable-list";
import { kanbanContract } from "../contracts/kanban";
import { sortableListContract } from "../contracts/sortable-list";
import { dragGroupContract } from "../contracts/drag-group";
import fixture from "../examples/hono-datastar/fixture.json";

const root = join(import.meta.dir, "..");
const output = join(root, "dist/site");

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
      <link rel="stylesheet" href="./demo.css" />
      <link rel="stylesheet" href="./site.css" />
    </head>
    <body data-signals='{"cardId":"","col":0,"before":"","itemId":"","fromList":"","toList":""}'>
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
                <a href="#server">05 · Wire a backend</a>
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
                  The public contracts live in <code>contracts/</code>. Core owns pointer capture, the detached preview,
                  target marking and post-move FLIP. The Rocket hosts own DOM lookup and event emission. Neither layer
                  knows which Datastar action your page will invoke or how your backend stores changes.
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
                    <b>contracts/</b>
                    <small>inputs &amp; outputs</small>
                  </span>
                  <span>
                    <b>core/</b>
                    <small>gesture &amp; motion</small>
                  </span>
                  <span>
                    <b>rocket/</b>
                    <small>host lifecycle</small>
                  </span>
                  <span>
                    <b>examples/</b>
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
                <p class="callout">
                  The included <code>datastar-rocket.js</code> bundle contains both Datastar and Rocket. Load it once;
                  there is no separate Pro runtime. See the{" "}
                  <a href="https://data-star.dev/reference/rocket">official Rocket reference</a> for its API.
                </p>
              </section>

              <section id="kanban" class="docs-section" aria-labelledby="kanban-title">
                <p class="section-kicker">STEP 02 / LIVE EXAMPLE</p>
                <h2 id="kanban-title">Kanban board</h2>
                <p>
                  Each lane carries a numeric <code>data-col</code>; cards carry stable IDs. Drag a card into another
                  lane, or focus a card and press <kbd>Alt</kbd>+<kbd>→</kbd>. The emitted event describes the target
                  lane and the card to insert before; it does not perform a mutation. Use <kbd>Alt</kbd>+<kbd>h</kbd>/
                  <kbd>j</kbd>/<kbd>k</kbd>/<kbd>l</kbd> to stage keyboard moves, then release Alt to commit.
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
              </section>

              <section id="server" class="docs-section" aria-labelledby="server-title">
                <p class="section-kicker">STEP 05 / SERVER HANDOFF</p>
                <h2 id="server-title">Server round trip</h2>
                <p>
                  Bind each semantic event to a Datastar action in your page. Your server handler validates the target,
                  updates authoritative state, and sends complete HTML over SSE. On this page, a site-only fetch shim
                  stands in for that handler and returns a <code>datastar-patch-elements</code> event. Datastar performs
                  the morph; Rocket animates items from their prior positions to the new ones.
                </p>
                <pre>
                  <code>{`event: datastar-patch-elements
data: selector #kanban-demo
data: mode outer
data: elements <div id="kanban-demo">…complete example…</div>`}</code>
                </pre>
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
                          <code>data-key-select-next</code>
                        </td>
                        <td>
                          <kbd>↓</kbd> / <kbd>j</kbd>
                        </td>
                        <td>Focus next card</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-select-previous</code>
                        </td>
                        <td>
                          <kbd>↑</kbd> / <kbd>k</kbd>
                        </td>
                        <td>Focus previous card</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-select-left</code>
                        </td>
                        <td>
                          <kbd>←</kbd> / <kbd>h</kbd>
                        </td>
                        <td>Focus card in previous lane</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-select-right</code>
                        </td>
                        <td>
                          <kbd>→</kbd> / <kbd>l</kbd>
                        </td>
                        <td>Focus card in next lane</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-move-up</code>
                        </td>
                        <td>
                          Alt + <kbd>↑</kbd> / <kbd>k</kbd>
                        </td>
                        <td>Move above previous card</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-move-down</code>
                        </td>
                        <td>
                          Alt + <kbd>↓</kbd> / <kbd>j</kbd>
                        </td>
                        <td>Move below next card</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-move-left</code>
                        </td>
                        <td>
                          Alt + <kbd>←</kbd> / <kbd>h</kbd>
                        </td>
                        <td>Move to previous lane</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-move-right</code>
                        </td>
                        <td>
                          Alt + <kbd>→</kbd> / <kbd>l</kbd>
                        </td>
                        <td>Move to next lane</td>
                      </tr>
                      <tr>
                        <td>
                          <code>data-key-cancel</code>
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
                  Override a slot with space-separated key tokens, e.g. <code>data-key-select-next="ArrowDown j"</code>.
                  Defaults come from <code>contracts/kanban.ts</code>.
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
                          <code>rocket-kanban-board</code>
                        </td>
                        <td>
                          <code>[data-kanban-lane][data-col]</code>, <code>[data-kanban-card]</code>
                        </td>
                        <td>
                          <code>rocket-kanban-move</code> <small>{`{ cardId, col, before }`}</small>
                          <br />
                          <code>rocket-kanban-select</code> <small>{`{ cardId }`}</small>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <code>rocket-sortable-list</code>
                        </td>
                        <td>
                          <code>[data-sortable-item]</code>
                        </td>
                        <td>
                          <code>rocket-sortable-move</code> <small>{`{ itemId, before }`}</small>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <code>rocket-drag-group</code>
                        </td>
                        <td>
                          <code>[data-drop-list]</code> + <code>[data-drag-item]</code>
                        </td>
                        <td>
                          <code>rocket-drag-group-move</code> <small>{`{ itemId, fromList, toList, before }`}</small>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  Events bubble and cross the custom-element boundary. <code>before: ""</code> means append. Keep IDs
                  stable across renders so morph and FLIP can match items.
                </p>
              </section>

              <section id="next" class="docs-section" aria-labelledby="next-title">
                <p class="section-kicker">ON THE HORIZON / 03</p>
                <h2 id="next-title">What's next</h2>
                <p>
                  Drag groups, Kanban and sortable lists are the first drag-and-drop examples. A bento grid and sortable
                  tree are useful next pressure tests for different target geometry and keyboard behavior. Each surface
                  can share core mechanics without pretending every layout is the same component.
                </p>
                <div class="layer-strip future-strip" aria-label="Potential drag-and-drop surfaces">
                  <span>
                    <b>Bento grid</b>
                    <small>two-dimensional placement · planned</small>
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
                  <code>html/template</code> and handles moves on the server. Your page chooses the Datastar action that
                  receives each event.
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
                  <a href="./examples/hono-datastar/adapter/kanban.tsx.txt">View the JSX adapter source ↗</a>
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
                  <a href="./examples/go/main.go.txt">View the Go server source ↗</a>
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
              </section>
            </div>
          </div>
        </main>
        <footer class="site-footer">
          <span>PD ROCKETS / VENDORABLE COMPONENTS</span>
          <a href="#top">Back to top ↑</a>
        </footer>
      </div>
      <script type="module" src="./fake-backend.js"></script>
      <script type="module" src="./rocket-kit.js"></script>
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
await mkdir(join(output, "examples/hono-datastar/adapter"), { recursive: true });
await mkdir(join(output, "examples/go"), { recursive: true });
await copyFile(
  join(root, "examples/hono-datastar/adapter/kanban.tsx"),
  join(output, "examples/hono-datastar/adapter/kanban.tsx.txt"),
);
await copyFile(join(root, "examples/go/main.go"), join(output, "examples/go/main.go.txt"));

const bundle = await readFile(join(root, "dist/rocket-kit.js"), "utf8");
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
