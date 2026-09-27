import { createHash } from "node:crypto";
import { copyFile, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

const root = join(import.meta.dir, "..");
const temp = await mkdtemp(join(root, "dist/consumer-"));
const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

try {
  const tar = Bun.spawn(["tar", "-xzf", join(root, "dist/pd-rockets-browser.tar.gz"), "-C", temp], {
    stderr: "pipe",
  });
  const [error, exit] = await Promise.all([new Response(tar.stderr).text(), tar.exited]);
  if (exit !== 0) throw new Error(`Could not extract browser release: ${error.trim()}`);

  const typesRoot = join(temp, "types");
  const manifest = JSON.parse(await readFile(join(typesRoot, "manifest.json"), "utf8")) as Array<{
    path: string;
    sha256: string;
  }>;
  const files = (await readdir(typesRoot, { recursive: true })).filter((path) => path.endsWith(".d.ts")).sort();
  if (JSON.stringify(files) !== JSON.stringify(manifest.map(({ path }) => path).sort())) {
    throw new Error("Release declaration manifest does not list exactly the extracted declarations");
  }
  for (const { path, sha256: expected } of manifest) {
    if (!/^(?:[a-z0-9-]+\/)*[a-z0-9-]+\.d\.ts$/.test(path)) throw new Error("Invalid declaration path");
    if (sha256(await readFile(join(typesRoot, path))) !== expected) throw new Error(`Invalid declaration: ${path}`);
  }

  const bundle = await readFile(join(temp, "pd-kit.js"), "utf8");
  const releaseFiles = await readdir(temp);
  if (releaseFiles.some((file) => file.startsWith("rocket-")) || bundle.includes("rocket-")) {
    throw new Error("Browser release exposes an obsolete Rocket-prefixed kit contract");
  }
  const imports = [...bundle.matchAll(/\bfrom\s*["']([^"']+)["']/g)].map((match) => match[1]);
  if (imports.length === 0 || imports.some((specifier) => specifier !== "pd-rockets/runtime")) {
    throw new Error("Full browser kit must import only the shared external Rocket runtime");
  }

  await copyFile(join(root, "tests/consumer/board.ts"), join(temp, "board.ts"));
  await writeFile(
    join(temp, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ESNext",
        module: "ESNext",
        moduleResolution: "bundler",
        strict: true,
        noEmit: true,
        types: [],
        paths: { "/js/pd-kit.js": ["./types/client-entry.d.ts"] },
      },
      include: ["board.ts"],
    }),
  );
  const check = Bun.spawn([join(root, "node_modules/.bin/tsc"), "-p", "tsconfig.json"], {
    cwd: temp,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, status] = await Promise.all([
    new Response(check.stdout).text(),
    new Response(check.stderr).text(),
    check.exited,
  ]);
  if (status !== 0) throw new Error(`Released declarations failed consumer typecheck:\n${stdout}${stderr}`);
  console.error("browser release consumer smoke passed");
} finally {
  await rm(temp, { recursive: true, force: true });
}
