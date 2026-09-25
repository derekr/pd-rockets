export const sortableTreeContract = {
  tag: "rocket-sortable-tree",
  selectors: {
    node: "[data-tree-node]",
    row: "[data-tree-row]",
    children: "[data-tree-children]",
  },
  events: { move: "rocket-tree-move" },
} as const;

/** Empty parent IDs address the root list; before is empty for the end of a list. */
export type TreeMoveDetail = { itemId: string; fromParent: string; toParent: string; before: string };
