import { createHash } from "node:crypto";
import { cp, copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { browserBundles } from "../browser-bundles";

const root = join(import.meta.dir, "..");
const staging = join(root, "dist/browser");
const archive = join(root, "dist/pd-rockets-browser.tar.gz");

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await copyFile(join(root, "LICENSE"), join(staging, "LICENSE"));
await cp(join(root, "dist/types"), join(staging, "types"), { recursive: true });
const typesRoot = join(staging, "types");
const declarations = (await readdir(typesRoot, { recursive: true })).filter((path) => path.endsWith(".d.ts")).sort();
if (!declarations.includes("client-entry.d.ts")) throw new Error("Missing browser declaration entry");
const manifest = await Promise.all(
  declarations.map(async (path) => ({
    path,
    sha256: createHash("sha256")
      .update(await readFile(join(typesRoot, path)))
      .digest("hex"),
  })),
);
await writeFile(join(typesRoot, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
for (const { file } of browserBundles) {
  await copyFile(join(root, "dist", file), join(staging, file));
  await copyFile(join(root, "dist", `${file}.br`), join(staging, `${file}.br`));
}

const tar = Bun.spawn(["tar", "-czf", archive, "-C", staging, "."], { stderr: "inherit" });
if ((await tar.exited) !== 0) throw new Error("Could not package the browser bundle");
console.error(`packaged ${archive}`);
