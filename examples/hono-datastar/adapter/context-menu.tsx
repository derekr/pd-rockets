import type { Child } from "hono/jsx";
import { contextMenuContract } from "../../../contracts/context-menu";
import { datastarEventBinding, type DatastarEventBinding } from "./event-binding";

/** The page owns the menu's actions and the markup cloned at open time. */
export function ContextMenu({ id, action, children }: { id: string; action?: DatastarEventBinding; children?: Child }) {
  return (
    <rocket-context-menu
      id={id}
      popover="auto"
      role="menu"
      {...datastarEventBinding(contextMenuContract.events.action, action)}
    >
      <template data-rocket-menu="">{children}</template>
    </rocket-context-menu>
  );
}
