import type { Child } from "hono/jsx";
import { componentAttrs, defineComponent, event } from "./component";
import { sortableListContract, type SortableMoveDetail } from "../../../contracts/sortable-list";
import { datastarEventBinding, type DatastarEventBinding } from "./event-binding";

const sortableListComponent = defineComponent({
  id: "rocket-kit-sortable-list",
  tag: sortableListContract.tag,
  client: { load: "eager" },
  events: {
    move: event<SortableMoveDetail>(sortableListContract.events.move),
  },
});

export type SortableListItem = { id: string; label: string };

export function SortableList({
  items,
  move,
  children,
}: {
  items: readonly SortableListItem[];
  move?: DatastarEventBinding;
  children?: Child;
}) {
  const actionAttrs = datastarEventBinding(sortableListContract.events.move, move);
  return (
    <rocket-sortable-list {...componentAttrs(sortableListComponent, {})} {...actionAttrs}>
      {items.map((item) => (
        <div data-sortable-item={item.id} tabindex={0}>
          {item.label}
        </div>
      ))}
      {children}
    </rocket-sortable-list>
  );
}
