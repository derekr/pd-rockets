/** Public browser artifacts; surface bundles include their core dependencies. */
export const rocketModule = "pd-rockets/rocket";

export const browserBundles = [
  { file: "rocket-core.js", entry: "core/index.ts" },
  { file: "rocket-kanban.js", entry: "rocket/kanban/client.ts" },
  { file: "rocket-sortable-list.js", entry: "rocket/sortable-list/client.ts" },
  { file: "rocket-drag-group.js", entry: "rocket/drag-group/client.ts" },
  { file: "rocket-bento-workspace.js", entry: "rocket/bento/client.ts" },
  { file: "rocket-sortable-tree.js", entry: "rocket/sortable-tree/client.ts" },
  { file: "rocket-context-menu.js", entry: "rocket/context-menu/client.ts" },
  { file: "rocket-inline-edit.js", entry: "rocket/inline-edit/client.ts" },
  { file: "rocket-kit.js", entry: "client-entry.ts" },
] as const;
