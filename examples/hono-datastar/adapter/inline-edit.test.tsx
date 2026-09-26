import { expect, test } from "bun:test";
import { renderHTML } from "./render";
import { InlineEdit } from "./inline-edit";

test("inline editor renders page-owned markup and semantic bindings", () => {
  const html = renderHTML(
    <InlineEdit
      contextId="card-a"
      commit={{
        event: "rocket-inline-edit-commit",
        attrs: { "data-on:rocket-inline-edit-commit": "$draft=evt.detail.value" },
      }}
    >
      <span data-inline-edit-trigger="" data-inline-edit-value="">
        Original
      </span>
      <input data-inline-edit-input="" value="Original" />
    </InlineEdit>,
  );
  expect(html).toContain('data-context-id="card-a"');
  expect(html).toContain('data-on:rocket-inline-edit-commit="$draft=evt.detail.value"');
  expect(html).toContain('data-inline-edit-trigger=""');
  expect(html).toContain('data-inline-edit-input=""');
});
