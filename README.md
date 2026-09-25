# PD rockets

PD rockets is a collection of vendorable components built with [Rocket](https://data-star.dev/reference/rocket),
Datastar's open-source web component API. Drag-and-drop is the first family: a multi-list drag group, Kanban,
sortable-list, bento-grid and file-tree surfaces are working examples. A server
renders light DOM; Rocket owns browser interaction and emits semantic events; the page connects those events to its
Datastar actions and backend handlers.

- `contracts/` — DOM inputs, keyboard defaults, and semantic event outputs.
- `core/` — pointer lifecycle, drag preview, and FLIP mechanics.
- `rocket/` — custom-element lifecycle and domain-specific target geometry.
- `examples/hono-datastar/` — JSX event bindings and a local DOM demo.
- `examples/go/` — Go templates, Datastar actions, and SSE morphs.
- `site/` — a static guide and live examples backed by an in-browser SSE fixture.

`rocket-drag-group` coordinates multiple `[data-drop-list]` regions containing `[data-drag-item]` elements. Pointer
dragging or Alt + arrows (or h/j/k/l) emits `rocket-drag-group-move` with `{ itemId, fromList, toList, before }`;
releasing Alt commits a keyboard move, and Escape cancels it. Groups are independent. Kanban keeps its own column and
card contract while sharing the insertion and pointer mechanics.

`rocket-bento-workspace` is an experimental two-grid dashboard surface. It reuses the pointer and FLIP lifecycle, but
uses cell coordinates and spans instead of list insertion targets. It calculates a transient, animated layout and emits
all changed positions on move or resize. The backend applies those positions and returns the confirmed HTML; the guide's
in-browser SSE fixture demonstrates that handoff without duplicating placement logic. The consuming page provides CSS
Grid tracks (`grid-template-columns` and a fixed `grid-auto-rows`) for pointer-to-cell geometry.

`rocket-sortable-tree` is a folder/file list with between-sibling insertion and drops into folders. Its
`rocket-tree-move` detail carries `{ itemId, fromParent, toParent, before }`; the backend applies that change and sends
rendered HTML over SSE. Pointer drops animate the dragged row from the floating preview's final position.

Every surface supports arrow-key and Vim-key focus navigation. Home/End navigate list, group, grid and tree items;
Alt + arrows or Alt + h/j/k/l stage moves, and Escape cancels staging. Bento also supports Shift + arrows for resizing
and Alt + PageUp/PageDown for switching grids. The file tree presents compact explorer-style rows rather than cards.
Nested Rocket hosts are supported: the nearest host owns each pointer or keyboard gesture. The guide includes a live
sortable list inside a drag-group item, with independent server-rendered move responses for each host. Semantic events
still bubble; page handlers on nested hosts with the same event name should check the event target.

Keyboard intents are configured on each host using `data-key-<intent>` attributes. Values are space-separated shortcuts
such as `data-key-focus-next="ArrowDown n"`; an empty value disables that intent. The shared focus intents are
`focus-next`, `focus-previous`, `focus-left`, `focus-right`, `focus-first`, and `focus-last`; moves use `move-up`,
`move-down`, `move-left`, and `move-right`, plus `cancel`. Each surface exposes only the directions it supports.
Bento also exposes `resize-up/down/left/right` and `grid-previous/next`. Kanban continues to accept its original
`data-key-select-next/previous/left/right` names; the corresponding `data-key-focus-*` attribute takes precedence.
All surface defaults live in `core/keyboard.ts`, with the Kanban compatibility defaults in `contracts/kanban.ts`.

The reusable client does not know about application actions, persistence, permissions, or transport policy. Rocket
provides the component boundary and lifecycle for local browser mechanics, while Datastar handles actions and HTML
updates. See the [Rocket reference](https://data-star.dev/reference/rocket) for the upstream API.

## Install prebuilt browser bundles

Tagged releases publish `pd-rockets-browser.tar.gz` with minified PD rockets JavaScript bundles, matching Brotli
`.js.br` files, and their Beer-Ware license. The guide lists the Brotli size beside each bundle download.
Replace `<owner>/<repo>` with the published GitHub repository:

```sh
mkdir -p public/js && curl -fsSL "https://github.com/<owner>/<repo>/releases/latest/download/pd-rockets-browser.tar.gz" | tar -xz -C public/js
```

Choose a single surface or the full collection:

| File                        | Use                                                                     |
| --------------------------- | ----------------------------------------------------------------------- |
| `rocket-core.js`            | Import framework-neutral pointer, insertion, keyboard and FLIP helpers. |
| `rocket-kanban.js`          | Kanban board.                                                           |
| `rocket-sortable-list.js`   | One sortable list.                                                      |
| `rocket-drag-group.js`      | Multiple lists.                                                         |
| `rocket-bento-workspace.js` | Dashboard grids.                                                        |
| `rocket-sortable-tree.js`   | Folder/file tree.                                                       |
| `rocket-kit.js`             | All surfaces.                                                           |

Each surface bundle includes the core code it needs; `rocket-core.js` is for direct imports, not a required second
script. The surface bundles import `rocket` from the external `pd-rockets/rocket` specifier. Map it to the open-source
[`datastar-rocket.js` bundle](https://data-star.dev/reference/rocket#bundle) before loading a surface:

```html
<script type="importmap">
  { "imports": { "pd-rockets/rocket": "/js/datastar-rocket.js" } }
</script>
<script type="module" src="/js/rocket-sortable-tree.js"></script>
```

The pinned upstream bundle includes both Datastar and Rocket, so the guide loads it without a separate `datastar.js`.
If an application uses separate scripts, map `pd-rockets/rocket` to a Rocket ES module exporting `rocket` that uses the
same Datastar instance; a standalone Datastar script by itself does not provide Rocket. Upstream v1.0.4 currently
publishes Rocket in the combined bundle. Keep its upstream MIT notice with the runtime; the PD rockets release archive
does not include it.
Serve the `.js` files normally; precompressed `.js.br` files are optional for servers configured to negotiate Brotli
and send `Content-Encoding: br` with a JavaScript content type. Do not reference `.js.br` in a script tag.

## Build and run locally

```sh
bun install
bun run serve:site
```

Open `http://localhost:4173`. `bun run build:client` produces all seven browser artifacts in `dist/`, and
`bun run bundle:browser` creates the release archive locally. The site build fetches the pinned open-source runtime into
ignored `public/js/`, verifies its SHA-256 and publishes it alongside the tracked upstream MIT notice.

The site build writes `dist/site`, a relative-path static artifact suitable for GitHub Pages. Its in-browser fixture
intercepts the demo actions and returns `datastar-patch-elements` SSE responses, exercising the same morph path
without an application server. The Pages workflow publishes this artifact on pushes to `main`; the guide's source links
use a generated, browsable copy of the public project files that also works when served locally. A bounded activity
queue shows synthetic Rocket events, demo action POSTs and SSE patch responses without displaying item text or request
bodies.

For a quick Chromium interaction run, install Playwright's browser once with `bunx playwright install chromium`, then
run `bun run test:browser`. Playwright starts a small synthetic fixture server, bundles the source once per run, and uses
four workers. Run a focused case with `bunx playwright test -g 'nested'`; `bun run test` retains the Bun unit tests.

To run the Hono JSX demo instead:

```sh
bun run demo
```

Then open `http://localhost:3025`. Its Hono handlers apply semantic moves to in-memory state and return HTML patches
over SSE.

To run the Go demo after `bun run runtime:fetch && bun run build:client`:

```sh
cd examples/go
go run .
```

Then open `http://localhost:3035`. It renders the same fixture, binds semantic events to Datastar actions, and
returns SSE element patches from Go handlers.

## License

PD rockets is available under the [Beer-Ware License](LICENSE). The vendored Datastar + Rocket runtime retains its
separate [MIT notice](public/js/DATASTAR-LICENSE.md); keep that notice with the runtime when vendoring.
