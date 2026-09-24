export const sortableListContract = {
  tag: "rocket-sortable-list",
  selectors: { item: "[data-sortable-item]" },
  events: { move: "rocket-sortable-move" },
} as const;

export type SortableMoveDetail = { itemId: string; before: string };
