import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { browserBundles } from "./browser-bundles";

const root = import.meta.dir;
for (const { entry, file } of browserBundles) {
  const output = join(root, "dist", file);
  const result = await Bun.build({
    entrypoints: [join(root, entry)],
    external: ["/js/datastar-rocket.js"],
    target: "browser",
  });
  if (!result.success || result.outputs.length !== 1 || !result.outputs[0]) {
    throw new AggregateError(result.logs, `rocket-kit: ${file} build failed`);
  }
  mkdirSync(dirname(output), { recursive: true });
  const bytes = await Bun.write(output, result.outputs[0]);
  console.error(`built ${output} (${bytes} bytes)`);
}
