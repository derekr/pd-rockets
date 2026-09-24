import { resolve, sep } from "node:path";

const root = resolve(import.meta.dir, "../dist/site");
const port = Number(process.env.ROCKET_KIT_SITE_PORT ?? 4173);

const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    const pathname = decodeURIComponent(url.pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const path = resolve(root, relative);

    if (path !== root && !path.startsWith(`${root}${sep}`)) {
      return new Response("Not found", { status: 404 });
    }

    const file = Bun.file(path);
    if (!(await file.exists())) return new Response("Not found", { status: 404 });
    return new Response(file);
  },
});

console.log(`Rocket kit site: http://localhost:${server.port}`);
