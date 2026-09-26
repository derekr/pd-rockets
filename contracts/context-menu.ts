export const contextMenuContract = {
  tag: "rocket-context-menu",
  selectors: { trigger: "[data-menu-for]", item: '[role="menuitem"], [role="menuitemradio"]' },
  events: { action: "rocket-menu-action" },
} as const;

export type MenuActionDetail = { action: string; contextId: string };
export type ContextMenuHost = HTMLElement & {
  openFor(trigger: HTMLElement, point?: { x: number; y: number }, context?: Record<string, string>): void;
};
