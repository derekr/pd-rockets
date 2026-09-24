import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const staging = join(root, "dist/browser");
const archive = join(root, "dist/pd-rockets-browser.tar.gz");

await rm(staging, { recursive: true, force: true });
await mkdir(staging, { recursive: true });
for (const [source, name] of [
  ["LICENSE", "LICENSE"],
  ["dist/rocket-kit.js", "rocket-kit.js"],
] as const) {
  await copyFile(join(root, source), join(staging, name));
}

const tar = Bun.spawn(["tar", "-czf", archive, "-C", staging, "."], { stderr: "inherit" });
if ((await tar.exited) !== 0) throw new Error("Could not package the browser bundle");
console.error(`packaged ${archive}`);
