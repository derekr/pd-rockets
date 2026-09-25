import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { browserBundles } from "../browser-bundles";

const root = join(import.meta.dir, "..");
const staging = join(root, "dist/browser");
const archive = join(root, "dist/pd-rockets-browser.tar.gz");

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
await copyFile(join(root, "LICENSE"), join(staging, "LICENSE"));
for (const { file } of browserBundles) {
  await copyFile(join(root, "dist", file), join(staging, file));
  await copyFile(join(root, "dist", `${file}.br`), join(staging, `${file}.br`));
}

const tar = Bun.spawn(["tar", "-czf", archive, "-C", staging, "."], { stderr: "inherit" });
if ((await tar.exited) !== 0) throw new Error("Could not package the browser bundle");
console.error(`packaged ${archive}`);
