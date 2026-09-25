import { cancelKeys, focusKeys, moveKeys } from "../core/keyboard";

export const kanbanContract = {
  tag: "rocket-kanban-board",
  selectors: {
    lane: "[data-kanban-lane]",
    card: "[data-kanban-card]",
    cardMain: "[data-kanban-card-main]",
  },
  events: {
    move: "rocket-kanban-move",
    select: "rocket-kanban-select",
  },
} as const;

export type KanbanMoveDetail = {
  cardId: string;
  col: number;
  before: string;
};

export type KanbanSelectDetail = { cardId: string };

export type KanbanKeySlot =
  | "selectNext"
  | "selectPrevious"
  | "selectLeft"
  | "selectRight"
  | "moveUp"
  | "moveDown"
  | "moveLeft"
  | "moveRight"
  | "cancel";

export type KanbanKeyboard = Partial<Record<KanbanKeySlot, readonly string[]>>;

export const defaultKanbanKeyboard: Readonly<Record<KanbanKeySlot, readonly string[]>> = {
  selectNext: focusKeys.focusNext,
  selectPrevious: focusKeys.focusPrevious,
  selectLeft: focusKeys.focusLeft,
  selectRight: focusKeys.focusRight,
  ...moveKeys,
  ...cancelKeys,
};

export function kanbanKeyboardConfig(overrides: KanbanKeyboard = {}): Record<KanbanKeySlot, readonly string[]> {
  return {
    ...defaultKanbanKeyboard,
    ...overrides,
  };
}
