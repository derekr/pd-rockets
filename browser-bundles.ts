/** Public browser artifacts; surface bundles include their core dependencies. */
export const rocketModule = "pd-rockets/runtime";

export const browserBundles = [
  { file: "pd-core.js", entry: "core/index.ts" },
  { file: "pd-kanban.js", entry: "rocket/kanban/client.ts" },
  { file: "pd-sortable-list.js", entry: "rocket/sortable-list/client.ts" },
  { file: "pd-drag-group.js", entry: "rocket/drag-group/client.ts" },
  { file: "pd-bento-workspace.js", entry: "rocket/bento/client.ts" },
  { file: "pd-sortable-tree.js", entry: "rocket/sortable-tree/client.ts" },
  { file: "pd-context-menu.js", entry: "rocket/context-menu/client.ts" },
  { file: "pd-inline-edit.js", entry: "rocket/inline-edit/client.ts" },
  { file: "pd-kit.js", entry: "client-entry.ts" },
] as const;
