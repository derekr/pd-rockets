import { expect, test } from "bun:test";
import { renderHTML } from "./render";
import { KanbanBoard } from "./kanban";

test("Datastar JSX adapter renders the Rocket DOM contract and keyboard defaults", () => {
  const html = renderHTML(
    <KanbanBoard
      columns={[{ id: 0, label: "Backlog", cards: [{ id: "a", title: "First card" }] }]}
      keyboard={{ selectNext: ["n"] }}
    />,
  );
  expect(html).toContain('<rocket-kanban-board data-key-select-next="n"');
  expect(html).toContain('data-key-move-left="Alt+ArrowLeft Alt+h"');
  expect(html).toContain('data-key-move-up="Alt+ArrowUp Alt+k"');
  expect(html).toContain('data-key-move-down="Alt+ArrowDown Alt+j"');
  expect(html).toContain('data-kanban-lane="" data-col="0"');
  expect(html).toContain('data-kanban-card="a"');
  expect(html).toContain("First card");
});
