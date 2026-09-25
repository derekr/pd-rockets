import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const upstream = "https://cdn.jsdelivr.net/gh/starfederation/datastar@v1.0.4/bundles/datastar-rocket.js";
const digest = "09cef0b29e760b43e2a3bb027eb47c9141c7287587927a88791c8df96fb518ec";
const sourceMapFooter = "//# sourceMappingURL=datastar-rocket.js.map\n";
const output = join(import.meta.dir, "../public/js/datastar-rocket.js");

const matchesPin = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex") === digest;

/** Fetch the pinned open-source runtime into an ignored local cache, without its source-map reference. */
export async function ensureRuntime(): Promise<void> {
  try {
    if (matchesPin(await readFile(output))) return;
  } catch {
    // No local copy yet.
  }
  const response = await fetch(upstream, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`Datastar bundle fetch failed (${response.status})`);
  const upstreamBundle = await response.text();
  if (!upstreamBundle.endsWith(sourceMapFooter)) throw new Error("Unexpected Datastar bundle footer");
  const runtime = upstreamBundle.slice(0, -sourceMapFooter.length);
  if (!matchesPin(Buffer.from(runtime))) throw new Error("Datastar bundle did not match the pinned SHA-256");
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, runtime);
}

if (import.meta.main) await ensureRuntime();
