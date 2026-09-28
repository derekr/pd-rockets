// A standalone page consumes only the released browser URL and its declared API.
import {
  installBoardCamera,
  installBoardColumnReorder,
  installBoardDrag,
  installBoardLaneTabs,
  installBoardProjection,
} from "/js/pd-kit.js";

declare const host: HTMLElement;

const projection = installBoardProjection({
  host,
  gridSelector: "#grid",
  truthStyleId: "truth",
  projectionStyleId: "preview",
  source: { holds: () => [], preview: () => null },
});
projection.sync();
projection.setSource(null);

const drag = installBoardDrag({
  host,
  lanes: () => [],
  snapshots: () => [{ col: 0, ids: [] }],
  cardId: (card) => card.id,
  cellOf: () => ({ col: 0, row: 0 }),
  projection: {
    setDropColumn: (col) => {
      const target: number | null = col;
      void target;
    },
    setDropLine: (cell) => {
      const target: { col: number; row: number } | null = cell;
      void target;
    },
    sync: () => projection.sync(),
  },
  onStart: (id, cell, card) => {
    void [id, cell.row, card];
  },
  onCommit: (id, cell, card, rect, mobileTarget) => {
    void [id, cell.col, card, rect.width, mobileTarget];
  },
  onCancel: () => {},
});
drag.adopt(host);
drag.dispose();

const reorder = installBoardColumnReorder({
  host,
  onReorder: (columnId, to) => {
    void [columnId, to];
  },
});
reorder.dispose();

const stopCamera = installBoardCamera({
  host,
  lanes: () => [],
  engaged: () => drag.engaged(),
  settle: (x, y) => drag.settle(x, y),
});
stopCamera();

const laneTabs = installBoardLaneTabs({
  host,
  tabSelector: "[data-tab]",
  scrollerSelector: "[data-pager]",
  lanes: () => [],
  tabColumn: (tab) => Number(tab.dataset.tab),
  laneColumn: (lane) => Number(lane.dataset.lane),
  mobileQuery: "(max-width: 800px)",
  draggingAttribute: "data-dragging",
  originAttribute: "data-origin",
  targetAttribute: "data-target",
  onDropTarget: (column, previous) => {
    const target: number | null = column;
    void [target, previous];
  },
});
laneTabs.reassert();
laneTabs.dispose();

// @ts-expect-error The released declarations must enforce required board callbacks.
installBoardDrag({ host });
