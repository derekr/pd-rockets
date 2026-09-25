import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { serve } from "bun";
import { KanbanBoard } from "./adapter/kanban";
import { DragGroup } from "./adapter/drag-group";
import { SortableList } from "./adapter/sortable-list";
import { renderHTML } from "./adapter/render";
import type { DatastarEventBinding } from "./adapter/event-binding";
import { kanbanContract } from "../../contracts/kanban";
import { sortableListContract } from "../../contracts/sortable-list";
import { dragGroupContract } from "../../contracts/drag-group";
import fixture from "./fixture.json";

const app = new Hono();
const root = import.meta.dir;
const datastarPath = join(root, "../../public/js/datastar-rocket.js");
const state = structuredClone(fixture);
const kanbanMove: DatastarEventBinding = {
  event: kanbanContract.events.move,
  attrs: {
    "data-on:rocket-kanban-move":
      "$cardId = evt.detail?.['cardId'] ?? null; $col = evt.detail?.['col'] ?? null; $before = evt.detail?.['before'] ?? null; @post('/move')",
  },
};
const listMove: DatastarEventBinding = {
  event: sortableListContract.events.move,
  attrs: {
    "data-on:rocket-sortable-move":
      "$itemId = evt.detail?.['itemId'] ?? null; $before = evt.detail?.['before'] ?? null; @post('/list-move')",
  },
};
const groupMove: DatastarEventBinding = {
  event: dragGroupContract.events.move,
  attrs: {
    "data-on:rocket-drag-group-move":
      "$itemId = evt.detail?.['itemId'] ?? null; $fromList = evt.detail?.['fromList'] ?? null; $toList = evt.detail?.['toList'] ?? null; $before = evt.detail?.['before'] ?? null; @post('/group-move')",
  },
};

function Demo() {
  return (
    <div id="rocket-demo">
      <div class="demo-block">
        <h2>Kanban</h2>
        <div class="kanban">
          <KanbanBoard id="kanban-board" columns={state.columns} move={kanbanMove} />
        </div>
      </div>
      <div class="demo-block">
        <h2>Sortable list</h2>
        <SortableList items={state.list} move={listMove} />
      </div>
      <div class="demo-block">
        <h2>Drag group</h2>
        <DragGroup lists={state.groups} move={groupMove} />
      </div>
    </div>
  );
}

function patch(): Response {
  const lines = ["event: datastar-patch-elements", "data: selector #rocket-demo", "data: mode outer"];
  for (const line of renderHTML(<Demo />).split("\n")) lines.push(`data: elements ${line}`);
  return new Response([...lines, "", ""].join("\n"), {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-store" },
  });
}

async function signals(request: Request): Promise<Record<string, unknown>> {
  const payload = (await request.json()) as { signals?: Record<string, unknown> };
  return payload.signals ?? {};
}

function relocate<T extends { id: string }>(source: T[], destination: T[], id: string, before: string): void {
  const item = source.find((candidate) => candidate.id === id);
  if (!item || before === id || (before && !destination.some((candidate) => candidate.id === before))) return;
  source.splice(source.indexOf(item), 1);
  const index = before ? destination.findIndex((candidate) => candidate.id === before) : destination.length;
  destination.splice(index, 0, item);
}

app.post("/move", async (c) => {
  const { cardId, col, before } = await signals(c.req.raw);
  const source = state.columns.find((column) => column.cards.some((card) => card.id === cardId));
  const destination = state.columns.find((column) => column.id === col);
  if (source && destination && typeof cardId === "string" && typeof before === "string")
    relocate(source.cards, destination.cards, cardId, before);
  return patch();
});
app.post("/list-move", async (c) => {
  const { itemId, before } = await signals(c.req.raw);
  if (typeof itemId === "string" && typeof before === "string") relocate(state.list, state.list, itemId, before);
  return patch();
});
app.post("/group-move", async (c) => {
  const { itemId, fromList, toList, before } = await signals(c.req.raw);
  const source = state.groups.find((group) => group.id === fromList);
  const destination = state.groups.find((group) => group.id === toList);
  if (source && destination && typeof itemId === "string" && typeof before === "string")
    relocate(source.items, destination.items, itemId, before);
  return patch();
});

app.get("/", (c) =>
  c.html(
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Rocket kit spike</title>
        <link rel="stylesheet" href="/demo.css" />
      </head>
      <body data-signals='{"cardId":"","col":0,"before":"","itemId":""}'>
        <h1>Rocket kit spike</h1>
        <p>Drag cards, use the Kanban keyboard defaults, or reorder the list.</p>
        <Demo />
        <script type="module" src="/rocket-kit.js"></script>
      </body>
    </html>,
  ),
);

async function asset(path: string, contentType: string): Promise<Response> {
  const file = Bun.file(join(root, "../../", path));
  return new Response(file, { headers: { "content-type": contentType } });
}

app.get("/rocket-kit.js", () => asset("dist/rocket-kit.js", "text/javascript; charset=utf-8"));
app.get(
  "/demo.css",
  async () =>
    new Response(await readFile(join(root, "demo.css")), {
      headers: { "content-type": "text/css; charset=utf-8" },
    }),
);
app.get(
  "/js/datastar-rocket.js",
  () =>
    new Response(Bun.file(datastarPath), {
      headers: { "content-type": "text/javascript; charset=utf-8" },
    }),
);

const port = Number(process.env.ROCKET_KIT_PORT ?? 3025);
serve({ fetch: app.fetch, port });
console.log(`Rocket kit demo: http://localhost:${port}`);
