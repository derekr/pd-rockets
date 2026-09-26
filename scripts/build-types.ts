import { rm } from "node:fs/promises";
import { join } from "node:path";

await rm(join(import.meta.dir, "../dist/types"), { recursive: true, force: true });
const build = Bun.spawn(["bunx", "tsc", "-p", "tsconfig.types.json"], { stdout: "inherit", stderr: "inherit" });
if ((await build.exited) !== 0) throw new Error("Could not build browser declarations");
