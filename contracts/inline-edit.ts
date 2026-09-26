export const inlineEditContract = {
  tag: "rocket-inline-edit",
  selectors: {
    trigger: "[data-inline-edit-trigger]",
    value: "[data-inline-edit-value]",
    input: "[data-inline-edit-input]",
  },
  events: {
    request: "rocket-inline-edit-request",
    commit: "rocket-inline-edit-commit",
    cancel: "rocket-inline-edit-cancel",
  },
} as const;

export type InlineEditRequestDetail = { contextId: string };
export type InlineEditCommitDetail = { contextId: string; value: string };
