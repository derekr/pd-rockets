// A standalone page consumes only the released browser URL and its declared API.
import { installBoardCamera, installBoardColumnReorder, installBoardDrag, installBoardProjection } from "/js/pd-kit.js";

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
  onCommit: (id, cell, card, rect, dropZone) => {
    void [id, cell.col, card, rect.width, dropZone?.dataset.pdBoardDropZone];
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

// @ts-expect-error The released declarations must enforce required board callbacks.
installBoardDrag({ host });
