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

The reusable client does not know about application actions, persistence, permissions, or transport policy. Rocket
provides the component boundary and lifecycle for local browser mechanics, while Datastar handles actions and HTML
updates. See the [Rocket reference](https://data-star.dev/reference/rocket) for the upstream API.

## Install prebuilt browser bundles

Tagged releases publish `pd-rockets-browser.tar.gz` with only PD rockets JavaScript bundles and their Beer-Ware license.
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
script. Load your chosen surface as a module, for example
`<script type="module" src="/js/rocket-sortable-tree.js"></script>`. Separately obtain the open-source
[`datastar-rocket.js` bundle](https://data-star.dev/reference/rocket#bundle) using the official Rocket bundle instructions
and serve it at `/js/datastar-rocket.js`. This bundle includes Datastar and Rocket; it replaces a separate `datastar.js`
on the page. Keep its upstream MIT notice with the runtime; the PD rockets release archive does not include it.

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

To run the Hono JSX demo instead:

```sh
bun run demo
```

Then open `http://localhost:3025`. Its local event listener demonstrates the semantic boundary without a backend.

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
