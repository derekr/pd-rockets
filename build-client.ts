import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { brotliCompressSync, constants } from "node:zlib";
import { browserBundles, rocketModule } from "./browser-bundles";

const root = import.meta.dir;
for (const { entry, file } of browserBundles) {
  const output = join(root, "dist", file);
  const result = await Bun.build({
    entrypoints: [join(root, entry)],
    external: [rocketModule],
    target: "browser",
    minify: true,
  });
  if (!result.success || result.outputs.length !== 1 || !result.outputs[0]) {
    throw new AggregateError(result.logs, `rocket-kit: ${file} build failed`);
  }
  mkdirSync(dirname(output), { recursive: true });
  const content = Buffer.from(await result.outputs[0].arrayBuffer());
  const compressed = brotliCompressSync(content, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT },
  });
  await Bun.write(output, content);
  await Bun.write(`${output}.br`, compressed);
  console.error(`built ${file} (${content.length} bytes, ${compressed.length} bytes br)`);
}
