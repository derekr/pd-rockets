import { isReleaseTag, nextReleaseTag } from "./release-tags";

function git(...args: string[]): string {
  const result = Bun.spawnSync(["git", ...args], { stdout: "pipe", stderr: "pipe" });
  if (result.exitCode !== 0) throw new Error(new TextDecoder().decode(result.stderr).trim());
  return new TextDecoder().decode(result.stdout).trim();
}

if (Bun.argv.length !== 2) throw new Error("Usage: bun run release:tag");
if (git("branch", "--show-current") !== "main") throw new Error("Check out main before tagging a release");
if (git("status", "--porcelain")) throw new Error("Commit or remove working-tree changes before tagging");
git("fetch", "origin", "main", "--tags");
if (git("rev-parse", "HEAD") !== git("rev-parse", "refs/remotes/origin/main")) {
  throw new Error("Local main must match origin/main before tagging");
}
const tag = nextReleaseTag(new Date(), git("tag", "--list").split("\n"));
if (!isReleaseTag(tag)) throw new Error("Invalid release tag");
git(
  "-c",
  "user.name=Example Contributor",
  "-c",
  "user.email=contributor@example.invalid",
  "tag",
  "-a",
  tag,
  "-m",
  `Release browser bundles ${tag}`,
);
try {
  git("push", "origin", `refs/tags/${tag}`);
} catch (error) {
  git("tag", "-d", tag);
  throw error;
}
console.log(`Published ${tag}; the tagged workflow will attach the browser archive.`);
