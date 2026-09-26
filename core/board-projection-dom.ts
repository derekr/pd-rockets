import { projectBoardMoves, type BoardProjectionMove } from "./board-projection";
import type { BoardLane } from "./board-geometry";

export type BoardHold = BoardProjectionMove & { state: string };
export type BoardProjectionSource = {
  holds(): Iterable<readonly [string, Omit<BoardHold, "cardId">]>;
  preview(): BoardProjectionMove | null;
};

/** Apply disposable board placements while server-rendered layout remains authoritative. */
export function installBoardProjection(options: {
  host: HTMLElement;
  gridSelector: string;
  truthStyleId: string;
  projectionStyleId: string;
  source?: BoardProjectionSource | null;
  emptyLaneSelector?: string;
  dragCardId?: () => string | null;
  adoptDragNode?: (card: HTMLElement) => void;
}) {
  const { host } = options;
  let source = options.source ?? null;
  let style: HTMLStyleElement | null = null;
  let ownsStyle = false;
  let syncing = false;
  let queued = false;
  const laneElements = (): HTMLElement[] => [
    ...host.querySelectorAll<HTMLElement>(`${options.gridSelector} > [data-board-lane]`),
  ];
  const laneByCol = (col: number) => laneElements().find((lane) => Number(lane.dataset.col) === col);
  const cardFor = (id: string) => host.querySelector<HTMLElement>(`[data-board-card="${CSS.escape(id)}"]`);
  const snapshots = (): BoardLane[] =>
    laneElements().map((lane) => ({
      col: Number(lane.dataset.col),
      ids: [...lane.querySelectorAll<HTMLElement>(":scope > [data-board-card]")].map(
        (card) => card.dataset.boardCard ?? "",
      ),
    }));
  const projectionStyle = () => {
    const truth = document.getElementById(options.truthStyleId);
    if (!truth) return null;
    style ??= document.getElementById(options.projectionStyleId) as HTMLStyleElement | null;
    if (!style) {
      style = document.createElement("style");
      style.id = options.projectionStyleId;
      ownsStyle = true;
    }
    // A persistent style may live outside the server's fat-morph region.
    // Preserve that location whenever it already sorts after truth.
    if (!(truth.compareDocumentPosition(style) & Node.DOCUMENT_POSITION_FOLLOWING)) {
      document.body.append(style);
    }
    return style;
  };
  const queueSync = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      sync();
    });
  };
  const moveToOrder = (cardId: string, order: BoardLane[]): void => {
    const lane = order.find((entry) => entry.ids.includes(cardId));
    const target = lane && laneByCol(lane.col);
    const card = cardFor(cardId);
    if (!lane || !target || !card) return;
    const following = lane.ids.slice(lane.ids.indexOf(cardId) + 1);
    let next: Element | null = options.emptyLaneSelector ? target.querySelector(options.emptyLaneSelector) : null;
    for (const id of following) {
      const sibling = target.querySelector<HTMLElement>(`:scope > [data-board-card="${CSS.escape(id)}"]`);
      if (sibling) {
        next = sibling;
        break;
      }
    }
    if (card.parentElement !== target || card.nextElementSibling !== next) {
      syncing = true;
      try {
        target.insertBefore(card, next);
      } finally {
        syncing = false;
      }
      // The structural lane changed; re-read live DOM once before writing its CSS rows.
      queueSync();
    }
  };
  const sync = () => {
    if (syncing) return;
    const holds = source ? [...source.holds()] : [];
    const held = new Set(holds.map(([id]) => id));
    for (const card of host.querySelectorAll<HTMLElement>("[data-board-card][data-persist-state]")) {
      if (!held.has(card.dataset.boardCard ?? "")) card.removeAttribute("data-persist-state");
    }
    const preview = source?.preview() ?? null;
    const moves: BoardProjectionMove[] = [];
    for (const [cardId, hold] of holds) {
      const card = cardFor(cardId);
      if (card && card.dataset.persistState !== hold.state) card.dataset.persistState = hold.state;
      if (preview?.cardId === cardId) continue;
      const structural = card?.closest<HTMLElement>("[data-board-lane]");
      const structuralCol = Number(structural?.dataset.col);
      // A newer authoritative snapshot can place the card in a different
      // structural origin before its pending landing is resolved.
      if (structural && structuralCol !== hold.col && Number.isInteger(structuralCol)) hold.fromCol = structuralCol;
      moves.push({
        cardId,
        col: hold.col,
        row: hold.row,
        fromCol: hold.fromCol,
      });
    }
    if (preview) moves.push(preview);
    const scope = host.id ? `#${CSS.escape(host.id)}` : "";
    const plan = projectBoardMoves(snapshots(), moves, scope);
    for (const lane of plan.order) {
      if (!plan.touchedColumns.has(lane.col)) continue;
      for (const id of lane.ids) if (plan.movedIds.has(id)) moveToOrder(id, plan.order);
    }
    const sheet = projectionStyle();
    if (sheet && sheet.textContent !== plan.css) sheet.textContent = plan.css;
  };
  const observer = new MutationObserver(() => {
    if (syncing) return;
    const dragging = options.dragCardId?.();
    const card = dragging && cardFor(dragging);
    if (card) {
      if (!card.hasAttribute("data-board-dragging")) card.setAttribute("data-board-dragging", "");
      options.adoptDragNode?.(card);
    }
    sync();
  });
  observer.observe(host, { childList: true, subtree: true });
  sync();
  return {
    sync,
    setSource(next: BoardProjectionSource | null) {
      source = next;
      sync();
    },
    clear() {
      // Clearing a landing does not detach the page's hold source: the same
      // board host can accept another drag without a second setSource call.
      sync();
    },
    dispose() {
      observer.disconnect();
      source = null;
      for (const card of host.querySelectorAll<HTMLElement>("[data-board-card][data-persist-state]")) {
        card.removeAttribute("data-persist-state");
      }
      if (ownsStyle) style?.remove();
      else if (style) style.textContent = "";
      style = null;
    },
  };
}
