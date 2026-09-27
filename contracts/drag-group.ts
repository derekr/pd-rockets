export const dragGroupContract = {
  tag: "pd-drag-group",
  selectors: {
    list: "[data-drop-list]",
    item: "[data-drag-item]",
  },
  events: { move: "rocket-drag-group-move" },
} as const;

/** Item IDs are unique within a group; list IDs identify server-rendered destinations. */
export type DragGroupMoveDetail = { itemId: string; fromList: string; toList: string; before: string };
