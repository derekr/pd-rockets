import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Hono } from "hono";
import { serve } from "bun";
import { KanbanBoard } from "./adapter/kanban";
import { SortableList } from "./adapter/sortable-list";
import fixture from "./fixture.json";

const app = new Hono();
const root = import.meta.dir;
const datastarPath = join(root, "../../public/js/datastar-rocket.js");

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
        <div id="rocket-demo">
          <div class="demo-block">
            <h2>Kanban</h2>
            <div class="kanban">
              <KanbanBoard id="kanban-board" columns={fixture.columns} />
            </div>
          </div>
          <div class="demo-block">
            <h2>Sortable list</h2>
            <SortableList items={fixture.list} />
          </div>
        </div>
        <script type="module" src="/rocket-kit.js"></script>
        <script type="module" src="/demo.js"></script>
      </body>
    </html>,
  ),
);

async function asset(path: string, contentType: string): Promise<Response> {
  const file = Bun.file(join(root, "../../", path));
  return new Response(file, { headers: { "content-type": contentType } });
}

app.get("/rocket-kit.js", () => asset("dist/rocket-kit.js", "text/javascript; charset=utf-8"));
app.get("/demo.js", () => asset("dist/demo.js", "text/javascript; charset=utf-8"));
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
