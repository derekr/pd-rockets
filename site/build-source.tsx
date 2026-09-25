import { copyFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { renderHTML } from "../examples/hono-datastar/adapter/render";

const directories = ["contracts", "core", "rocket", "examples", "site", "scripts"];
const rootFiles = ["README.md", "browser-bundles.ts", "build-client.ts", "client-entry.ts", "package.json"];
const sourceFile = /\.(?:ts|tsx|go|json|css|md)$|\.mod$/;

/** Publish browsable, plain-text copies of the public source without a GitHub-specific URL. */
export async function buildSourceIndex(root: string, output: string, assetVersion: string): Promise<void> {
  const sourceOutput = join(output, "source");

  const buildDirectory = async (relative: string): Promise<void> => {
    const entries = relative
      ? (await readdir(join(root, relative), { withFileTypes: true })).filter(
          (entry) => entry.isDirectory() || (entry.isFile() && sourceFile.test(entry.name)),
        )
      : [];
    const depth = relative ? relative.split("/").length : 0;
    const backToGuide = "../".repeat(depth + 1);
    const links = relative
      ? entries.map((entry) => ({
          label: `${entry.name}${entry.isDirectory() ? "/" : ""}`,
          href: entry.isDirectory() ? `${entry.name}/index.html` : `${entry.name}.txt`,
        }))
      : [
          ...directories.map((name) => ({ label: `${name}/`, href: `${name}/index.html` })),
          ...rootFiles.map((name) => ({ label: name, href: `${name}.txt` })),
        ];

    const destination = join(sourceOutput, relative);
    await mkdir(destination, { recursive: true });
    await writeFile(
      join(destination, "index.html"),
      `<!doctype html>${renderHTML(
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>{relative || "Source"} · PD rockets</title>
            <link rel="stylesheet" href={`${backToGuide}site.css?v=${assetVersion}`} />
          </head>
          <body>
            <main class="source-index">
              <p>
                <a href={`${backToGuide}index.html`}>← Guide</a>
              </p>
              {relative && (
                <p>
                  <a href="../index.html">↑ Parent directory</a>
                </p>
              )}
              <h1>{relative ? `${relative}/` : "Source"}</h1>
              <ul>
                {links.map(({ label, href }) => (
                  <li>
                    <a href={href}>
                      <code>{label}</code>
                    </a>
                  </li>
                ))}
              </ul>
            </main>
          </body>
        </html>,
      )}`,
    );

    for (const entry of entries) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await buildDirectory(path);
      else await copyFile(join(root, path), join(sourceOutput, `${path}.txt`));
    }
  };

  await buildDirectory("");
  for (const name of directories) await buildDirectory(name);
  for (const name of rootFiles) await copyFile(join(root, name), join(sourceOutput, `${name}.txt`));
}
