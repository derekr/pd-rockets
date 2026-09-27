export const sortableListContract = {
  tag: "pd-sortable-list",
  selectors: { item: "[data-sortable-item]" },
  events: { move: "rocket-sortable-move" },
} as const;

export type SortableMoveDetail = { itemId: string; before: string };
