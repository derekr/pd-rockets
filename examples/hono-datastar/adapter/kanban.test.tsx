import { expect, test } from "bun:test";
import { renderHTML } from "./render";
import { KanbanBoard } from "./kanban";

test("Datastar JSX adapter renders the Rocket DOM contract and explicit keyboard overrides", () => {
  const html = renderHTML(
    <KanbanBoard
      id="demo-board"
      columns={[{ id: 0, label: "Backlog", cards: [{ id: "a", title: "First card" }] }]}
      keyboard={{ selectNext: ["n"] }}
    />,
  );
  expect(html).toContain('<rocket-kanban-board id="demo-board"');
  expect(html).toContain('data-key-select-next="n"');
  expect(html).not.toContain("data-key-move-left");
  expect(html).toContain('data-kanban-lane="" data-col="0"');
  expect(html).toContain('data-kanban-card="a"');
  expect(html).toContain('id="demo-board-card-a"');
  expect(html).toContain("First card");
});
