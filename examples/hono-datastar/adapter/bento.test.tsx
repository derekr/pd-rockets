import { expect, test } from "bun:test";
import { BentoWorkspace } from "./bento";
import { renderHTML } from "./render";

test("bento workspace renders two independently identified grids and spans", () => {
  const html = renderHTML(
    <BentoWorkspace
      grids={[
        {
          id: "one",
          label: "One",
          columns: 4,
          items: [{ id: "a", label: "Tile A", col: 1, row: 2, width: 2, height: 1 }],
        },
        { id: "two", label: "Two", columns: 4, items: [] },
      ]}
    />,
  );
  expect(html).toContain('data-bento-grid="one" data-columns="4"');
  expect(html).toContain('data-bento-grid="two" data-columns="4"');
  expect(html).toContain(
    'data-bento-item="a" data-bento-col="1" data-bento-row="2" data-bento-width="2" data-bento-height="1"',
  );
  expect(html).toContain('data-bento-resize=""');
});
