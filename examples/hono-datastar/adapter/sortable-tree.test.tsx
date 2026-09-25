import { expect, test } from "bun:test";
import { SortableTree } from "./sortable-tree";
import { renderHTML } from "./render";

test("directory tree renders nested and empty destinations with a page-owned action", () => {
  const html = renderHTML(
    <SortableTree
      nodes={[
        { id: "src", name: "src", kind: "folder", children: [{ id: "a", name: "index.ts", kind: "file" }] },
        { id: "empty", name: "drafts", kind: "folder", children: [] },
      ]}
      move={{ event: "rocket-tree-move", attrs: { "data-on:rocket-tree-move": "@post('./tree-move')" } }}
    />,
  );
  expect(html).toContain('data-tree-children="" data-tree-parent="src"');
  expect(html).toContain('data-tree-children="" data-tree-parent="empty"');
  expect(html).toContain('data-tree-node="a" data-tree-kind="file"');
  expect(html).toContain('data-on:rocket-tree-move="@post(&#39;./tree-move&#39;)"');
});
