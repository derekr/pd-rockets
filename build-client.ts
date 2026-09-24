import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = import.meta.dir;
const output = join(root, "dist/rocket-kit.js");
const result = await Bun.build({
  entrypoints: [join(root, "client-entry.ts")],
  external: ["/js/datastar-rocket.js"],
  target: "browser",
});
if (!result.success || result.outputs.length !== 1 || !result.outputs[0]) {
  throw new AggregateError(result.logs, "rocket-kit: client build failed");
}
mkdirSync(dirname(output), { recursive: true });
const bytes = await Bun.write(output, result.outputs[0]);
console.error(`built ${output} (${bytes} bytes)`);

const demo = await Bun.build({
  entrypoints: [join(root, "examples/hono-datastar/client.ts")],
  target: "browser",
});
if (!demo.success || demo.outputs.length !== 1 || !demo.outputs[0]) {
  throw new AggregateError(demo.logs, "rocket-kit: demo build failed");
}
const demoOutput = join(root, "dist/demo.js");
const demoBytes = await Bun.write(demoOutput, demo.outputs[0]);
console.error(`built ${demoOutput} (${demoBytes} bytes)`);
