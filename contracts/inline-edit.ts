export const inlineEditContract = {
  tag: "pd-inline-edit",
  selectors: {
    trigger: "[data-inline-edit-trigger]",
    value: "[data-inline-edit-value]",
    input: "[data-inline-edit-input]",
  },
  events: {
    request: "pd-inline-edit-request",
    commit: "pd-inline-edit-commit",
    cancel: "pd-inline-edit-cancel",
  },
} as const;

export type InlineEditRequestDetail = { contextId: string };
export type InlineEditCommitDetail = { contextId: string; value: string };
