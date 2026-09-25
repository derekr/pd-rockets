export const bentoContract = {
  tag: "rocket-bento-workspace",
  selectors: {
    grid: "[data-bento-grid]",
    item: "[data-bento-item]",
    resize: "[data-bento-resize]",
  },
  events: { move: "rocket-bento-move", resize: "rocket-bento-resize" },
} as const;

export type BentoMoveDetail = {
  itemId: string;
  fromGrid: string;
  toGrid: string;
  updates: BentoPosition[];
};

export type BentoPosition = { itemId: string; grid: string; col: number; row: number; width: number; height: number };

export type BentoResizeDetail = { itemId: string; grid: string; updates: BentoPosition[] };
