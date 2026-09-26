import type { Child } from "hono/jsx";
import { inlineEditContract } from "../../../contracts/inline-edit";
import { datastarEventBinding, type DatastarEventBinding } from "./event-binding";

/** The consuming page renders the title/input and owns edit state and saving. */
export function InlineEdit({
  contextId,
  request,
  commit,
  cancel,
  children,
}: {
  contextId: string;
  request?: DatastarEventBinding;
  commit?: DatastarEventBinding;
  cancel?: DatastarEventBinding;
  children?: Child;
}) {
  return (
    <rocket-inline-edit
      data-context-id={contextId}
      {...datastarEventBinding(inlineEditContract.events.request, request)}
      {...datastarEventBinding(inlineEditContract.events.commit, commit)}
      {...datastarEventBinding(inlineEditContract.events.cancel, cancel)}
    >
      {children}
    </rocket-inline-edit>
  );
}
