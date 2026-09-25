# PD rockets

PD rockets is a collection of vendorable components built with [Rocket](https://data-star.dev/reference/rocket),
Datastar's open-source web component API. Drag-and-drop is the first family: a multi-list drag group, Kanban, and
sortable-list surfaces are working examples, with bento-grid and sortable-tree layouts as future pressure tests. A server
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

The reusable client does not know about application actions, persistence, permissions, or transport policy. Rocket
provides the component boundary and lifecycle for local browser mechanics, while Datastar handles actions and HTML
updates. See the [Rocket reference](https://data-star.dev/reference/rocket) for the upstream API.

## Build and run

```sh
bun install
bun run build:client
bun run serve:site
```

Open `http://localhost:4173`. `dist/rocket-kit.js` is the vendorable client bundle. It imports Rocket from
`/js/datastar-rocket.js`; the repo includes the pinned open-source Datastar + Rocket bundle under `public/js/` with its
MIT notice. Serve both files from the same origin in a consuming application.

For a tagged release, GitHub Actions publishes `pd-rockets-browser.tar.gz` with `rocket-kit.js` and its license. Replace
`<owner>/<repo>` with the published GitHub repository to vendor PD rockets in one line:

```sh
mkdir -p public/js && curl -fsSL "https://github.com/<owner>/<repo>/releases/latest/download/pd-rockets-browser.tar.gz" | tar -xz -C public/js
```

Run `bun run bundle:browser` to produce the same archive locally. Separately obtain the open-source
[`datastar-rocket.js` bundle](https://data-star.dev/reference/rocket#bundle) using the official Rocket bundle instructions
and serve it at `/js/datastar-rocket.js`. This bundle includes Datastar and Rocket; it replaces a separate `datastar.js`
on the page. Keep its upstream MIT notice with the runtime. The repository pins a copy with the notice in `public/js/`
for its local examples and generated site; the PD rockets release archive does not include it.

The site build writes `dist/site`, a relative-path static artifact suitable for GitHub Pages. Its in-browser fixture
intercepts the two demo actions and returns `datastar-patch-elements` SSE responses, exercising the same morph path
without an application server.

To run the Hono JSX demo instead:

```sh
bun run demo
```

Then open `http://localhost:3025`. Its local event listener demonstrates the semantic boundary without a backend.

To run the Go demo after `bun run build:client`:

```sh
cd examples/go
go run .
```

Then open `http://localhost:3035`. It renders the same fixture, binds semantic events to Datastar actions, and
returns SSE element patches from Go handlers.

## License

PD rockets is available under the [Beer-Ware License](LICENSE). The vendored Datastar + Rocket runtime retains its
separate [MIT notice](public/js/DATASTAR-LICENSE.md); keep that notice with the runtime when vendoring.
