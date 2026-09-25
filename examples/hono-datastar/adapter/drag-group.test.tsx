import { expect, test } from "bun:test";
import { DragGroup } from "./drag-group";
import { renderHTML } from "./render";

test("drag group renders independent list regions and the semantic event binding", () => {
  const html = renderHTML(
    <DragGroup
      lists={[
        { id: "inbox", label: "Inbox", items: [{ id: "a", label: "First" }] },
        { id: "later", label: "Later", items: [] },
      ]}
      move={{ event: "rocket-drag-group-move", attrs: { "data-on:rocket-drag-group-move": "@post('/move')" } }}
    />,
  );
  expect(html).toContain('<rocket-drag-group data-on:rocket-drag-group-move="@post(&#39;/move&#39;)">');
  expect(html).toContain('data-drop-list="inbox"');
  expect(html).toContain('data-drop-list="later"');
  expect(html).toContain('data-drag-item="a" tabindex="0"');
});
