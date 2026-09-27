export const contextMenuContract = {
  tag: "pd-context-menu",
  selectors: { trigger: "[data-menu-for]", item: '[role="menuitem"], [role="menuitemradio"]' },
  events: { action: "pd-menu-action", scope: "pd-menu-scope" },
} as const;

export type MenuActionDetail = { action: string; contextId: string };
export type MenuScopeDetail = { root: HTMLElement; active: boolean };
export type ContextMenuHost = HTMLElement & {
  openFor(trigger: HTMLElement, point?: { x: number; y: number }, context?: Record<string, string>): void;
  closeMenu(refocus?: boolean): void;
  isOpen(): boolean;
};
