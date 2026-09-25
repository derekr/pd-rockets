import { dragGroupContract } from "../../../contracts/drag-group";
import { datastarEventBinding, type DatastarEventBinding } from "./event-binding";

export type DragGroupList = {
  id: string;
  label: string;
  items: readonly { id: string; label: string }[];
};

export function DragGroup({ lists, move }: { lists: readonly DragGroupList[]; move?: DatastarEventBinding }) {
  return (
    <rocket-drag-group {...datastarEventBinding(dragGroupContract.events.move, move)}>
      {lists.map((list) => (
        <section data-drop-list={list.id} aria-label={list.label}>
          <h3>{list.label}</h3>
          {list.items.map((item) => (
            <div data-drag-item={item.id} tabindex={0}>
              {item.label}
            </div>
          ))}
        </section>
      ))}
    </rocket-drag-group>
  );
}
