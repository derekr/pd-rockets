import { expect, test } from "bun:test";
import { renderHTML } from "./render";
import { SortableList } from "./sortable-list";

test("Datastar JSX adapter renders the sortable-list contract", () => {
  const html = renderHTML(<SortableList items={[{ id: "a", label: "First" }]} />);
  expect(html).toContain("<rocket-sortable-list");
  expect(html).toContain('data-sortable-item="a"');
  expect(html).toContain("First");
});
