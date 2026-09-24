import type { Child } from "hono/jsx";
import { componentAttrs, defineComponent, event } from "./component";
import {
  kanbanContract,
  kanbanKeyboardConfig,
  type KanbanKeyboard,
  type KanbanMoveDetail,
  type KanbanSelectDetail,
} from "../../../contracts/kanban";
import { datastarEventBinding, type DatastarEventBinding } from "./event-binding";

export const kanbanComponent = defineComponent({
  id: "rocket-kit-kanban",
  tag: kanbanContract.tag,
  client: { load: "eager" },
  events: {
    move: event<KanbanMoveDetail>(kanbanContract.events.move, {
      description: "A card was committed to a lane and insertion target.",
    }),
    select: event<KanbanSelectDetail>(kanbanContract.events.select, {
      description: "A card received keyboard or pointer selection.",
    }),
  },
});

export type KanbanCard = { id: string; title: string };
export type KanbanColumn = { id: number; label: string; cards: readonly KanbanCard[] };

export type KanbanBoardProps = {
  id?: string;
  columns: readonly KanbanColumn[];
  keyboard?: KanbanKeyboard;
  move?: DatastarEventBinding;
  select?: DatastarEventBinding;
  children?: Child;
};

function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/**
 * Datastar/JSX is one implementation of the Rocket contract. It owns the
 * server-side DOM shape and event binding; the Rocket client only sees the
 * resulting attributes and emits the declared event.
 */
export function KanbanBoard({ id, columns, keyboard, move, select, children }: KanbanBoardProps) {
  const keyConfig = kanbanKeyboardConfig(keyboard);
  const keyAttrs = Object.fromEntries(
    Object.entries(keyConfig).map(([slot, keys]) => [`data-key-${kebab(slot)}`, keys.join(" ")]),
  );
  const actionAttrs = {
    ...datastarEventBinding(kanbanContract.events.move, move),
    ...datastarEventBinding(kanbanContract.events.select, select),
  };
  return (
    <rocket-kanban-board id={id} {...componentAttrs(kanbanComponent, {})} {...keyAttrs} {...actionAttrs}>
      {columns.map((column) => (
        <section data-kanban-lane="" data-col={column.id} aria-label={column.label}>
          <h2>{column.label}</h2>
          <div data-kanban-lane-cards="">
            {column.cards.map((card) => (
              <article data-kanban-card={card.id} tabindex={0}>
                <button type="button" data-kanban-card-main="">
                  {card.title}
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
      {children}
    </rocket-kanban-board>
  );
}
