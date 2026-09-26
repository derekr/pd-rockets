import { cellFromPoint, insertOrder, parseGridTemplate, rowCenter, type BoardLane } from "./board-geometry";
import { dragPreviewFor } from "./visual-outlets";

export type BoardCell = { col: number; row: number };
export type BoardDragMobile = {
  startCardDrag(col: number): void;
  finishCardDrag(): void;
  trackPointer(event: PointerEvent): void;
  updateDropTarget(): void;
  targetColumn(): number | null;
  show(col: number): void;
};
export type BoardDragOptions = {
  host: HTMLElement;
  lanes(): HTMLElement[];
  snapshots(): BoardLane[];
  cardId(card: HTMLElement): string;
  cellOf(card: HTMLElement): BoardCell | null;
  projection: {
    setDropColumn(col: number | null): void;
    setDropLine(cell: BoardCell | null, excludeId?: string): void;
    sync(): void;
  };
  mobile?(): BoardDragMobile | null;
  onPress?(card: HTMLElement): void;
  canStart?(): boolean;
  onStart(cardId: string, cell: BoardCell, card: HTMLElement): void;
  onCommit(cardId: string, cell: BoardCell, card: HTMLElement, previewRect: DOMRect, mobileTarget: number | null): void;
  onCancel(): void;
};

/** Lane-grid pointer mechanics. Markup, mobile affordances and command policy belong to the page. */
export function installBoardDrag(options: BoardDragOptions) {
  const { host, projection } = options;
  let pending: { cardId: string; pointerId: number; x: number; y: number; rect: DOMRect; cell: BoardCell } | null =
    null;
  let drag: {
    cardId: string;
    item: HTMLElement;
    pointerId: number;
    offsetX: number;
    offsetY: number;
    width: number;
    height: number;
    originCol: number;
    lastLane: number;
    lastRow: number;
    changedAt: number;
    preview: HTMLElement;
    base: { left: number; top: number };
  } | null = null;
  let frame = 0;
  let queued: PointerEvent | null = null;
  let geo: Array<{
    col: number;
    rect: { left: number; right: number; top: number };
    tracks: { rows: number[]; gap: number };
  }> = [];
  let scrollX = 0;
  let scrollY = 0;
  const cardFor = (id: string) => host.querySelector<HTMLElement>(`[data-board-card="${CSS.escape(id)}"]`);
  const mobile = () => options.mobile?.() ?? null;
  function measure() {
    geo = options.lanes().map((lane) => {
      const rect = lane.getBoundingClientRect();
      const style = getComputedStyle(lane);
      return {
        col: Number(lane.dataset.col),
        rect: { left: rect.left, right: rect.right, top: rect.top },
        tracks: { rows: parseGridTemplate(style.gridTemplateRows), gap: parseFloat(style.rowGap) || 0 },
      };
    });
    scrollX = window.scrollX;
    scrollY = window.scrollY;
  }
  function targetAt(x: number, y: number) {
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) measure();
    const cell = cellFromPoint(geo, x, y);
    const lane = cell && geo[cell.lane];
    return cell && lane && Number.isInteger(lane.col) ? { lane: cell.lane, col: lane.col, row: cell.row } : null;
  }
  function landing(cardId: string, col: number, row: number): BoardCell {
    const lane = insertOrder(options.snapshots(), cardId, col, row).find((entry) => entry.col === col);
    return { col, row: Math.max(0, lane?.ids.indexOf(cardId) ?? row) };
  }
  function release(pointerId: number) {
    try {
      host.releasePointerCapture(pointerId);
    } catch {
      // Capture may have been released by the browser.
    }
  }
  function start(event: PointerEvent) {
    if (!pending) return;
    const { cardId, rect, cell } = pending;
    const card = cardFor(cardId);
    if (!card) {
      release(pending.pointerId);
      pending = null;
      return;
    }
    card.setAttribute("data-board-dragging", "");
    projection.setDropColumn(cell.col);
    projection.setDropLine(cell, cardId);
    options.onStart(cardId, cell, card);
    const customPreview = !!card.querySelector(":scope > template[data-rocket-preview]");
    const preview = dragPreviewFor(card);
    preview.removeAttribute("id");
    preview.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    preview.querySelectorAll("button, input").forEach((element) => element.remove());
    preview.removeAttribute("data-board-dragging");
    preview.setAttribute("data-board-preview", "");
    preview.setAttribute("aria-hidden", "true");
    preview.inert = true;
    preview.style.position = "fixed";
    preview.style.left = `${rect.left}px`;
    preview.style.top = `${rect.top}px`;
    if (!customPreview) {
      preview.style.width = `${rect.width}px`;
      preview.style.height = `${rect.height}px`;
    }
    preview.style.setProperty("--rocket-source-width", `${rect.width}px`);
    preview.style.setProperty("--rocket-source-height", `${rect.height}px`);
    preview.style.margin = "0";
    preview.style.zIndex = "100";
    preview.style.pointerEvents = "none";
    preview.style.viewTransitionName = "none";
    preview.style.willChange = "transform";
    preview.style.contain = "layout style";
    document.body.append(preview);
    measure();
    drag = {
      cardId,
      item: card,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      originCol: cell.col,
      lastLane: geo.findIndex((lane) => lane.col === cell.col),
      lastRow: cell.row,
      changedAt: 0,
      preview,
      base: { left: rect.left, top: rect.top },
    };
    pending = null;
    mobile()?.startCardDrag(cell.col);
  }
  function move(event: PointerEvent) {
    mobile()?.trackPointer(event);
    if (!drag) return;
    const left = event.clientX - drag.offsetX;
    const top = event.clientY - drag.offsetY;
    drag.preview.style.transform = `translate3d(${left - drag.base.left}px, ${top - drag.base.top}px, 0)`;
    if (!drag.item.isConnected) drag.item = cardFor(drag.cardId) ?? drag.item;
    const target = targetAt(left + drag.width / 2, top + drag.height / 2);
    if (!target) return;
    const now = performance.now();
    if (now - drag.changedAt < 40 || (target.lane === drag.lastLane && target.row === drag.lastRow)) return;
    if (target.lane === drag.lastLane) {
      const tracks = geo[drag.lastLane]?.tracks;
      if (tracks) {
        const center = geo[drag.lastLane]!.rect.top + rowCenter(tracks.rows, tracks.gap, drag.lastRow);
        const pitch = (tracks.rows[drag.lastRow] ?? tracks.rows[0] ?? 0) + tracks.gap || 1;
        const offset = (top + drag.height / 2 - center) / pitch;
        if (Math.abs(offset) < (target.row > drag.lastRow === offset > 0 ? 0.5 : 0.9)) return;
      }
    }
    drag.lastLane = target.lane;
    drag.lastRow = target.row;
    drag.changedAt = now;
    if (mobile()?.targetColumn() != null) return;
    projection.setDropColumn(target.col);
    projection.setDropLine(landing(drag.cardId, target.col, target.row), drag.cardId);
  }
  function clear() {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    queued = null;
    if (drag) {
      (cardFor(drag.cardId) ?? drag.item).removeAttribute("data-board-dragging");
      drag.preview.remove();
      release(drag.pointerId);
      drag = null;
    }
    if (pending) release(pending.pointerId);
    pending = null;
  }
  function finish(commit: boolean, x?: number, y?: number) {
    if (!drag) {
      clear();
      return;
    }
    const current = drag;
    mobile()?.updateDropTarget();
    const mobileTarget = mobile()?.targetColumn() ?? null;
    const fresh =
      x !== undefined && y !== undefined
        ? targetAt(x - current.offsetX + current.width / 2, y - current.offsetY + current.height / 2)
        : null;
    const lane = fresh ?? geo[current.lastLane];
    const col = lane?.col ?? current.originCol;
    const row = fresh?.row ?? current.lastRow;
    let cell = landing(current.cardId, col, row);
    if (mobileTarget != null) {
      const target = options.lanes().find((item) => Number(item.dataset.col) === mobileTarget);
      cell = {
        col: mobileTarget,
        row: [...(target?.querySelectorAll<HTMLElement>(":scope > [data-board-card]") ?? [])].filter(
          (card) => options.cardId(card) !== current.cardId,
        ).length,
      };
    }
    const item = cardFor(current.cardId) ?? current.item;
    const rect = current.preview.getBoundingClientRect();
    projection.setDropColumn(null);
    projection.setDropLine(null);
    mobile()?.finishCardDrag();
    if (commit) options.onCommit(current.cardId, cell, item, rect, mobileTarget);
    else options.onCancel();
    clear();
    projection.sync();
    if (commit && mobileTarget != null) mobile()?.show(mobileTarget);
  }
  const onDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest("button, a, input, textarea, select")) return;
    const card = target?.closest<HTMLElement>("[data-board-card]");
    if (!card || !host.contains(card)) return;
    options.onPress?.(card);
    card.focus({ preventScroll: true });
    if (!target?.closest("[data-rocket-board-drag-handle]")) return;
    if (pending || drag || options.canStart?.() === false) return;
    const cell = options.cellOf(card);
    if (!cell) return;
    event.preventDefault();
    host.setPointerCapture(event.pointerId);
    pending = {
      cardId: options.cardId(card),
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      rect: card.getBoundingClientRect(),
      cell,
    };
  };
  const onMove = (event: PointerEvent) => {
    mobile()?.trackPointer(event);
    if (pending && !drag) {
      if (
        event.pointerId === pending.pointerId &&
        Math.hypot(event.clientX - pending.x, event.clientY - pending.y) >= 5
      )
        start(event);
      return;
    }
    if (!drag || event.pointerId !== drag.pointerId) return;
    queued = event;
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        const next = queued;
        queued = null;
        if (next) move(next);
      });
  };
  const onUp = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) finish(true, event.clientX, event.clientY);
    else if (pending?.pointerId === event.pointerId) clear();
  };
  const onCancel = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId || pending?.pointerId === event.pointerId) finish(false);
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onCancel);
  return {
    engaged: () => !!(pending || drag),
    draggedId: () => drag?.cardId ?? null,
    adopt: (card: HTMLElement) => {
      if (drag) drag.item = card;
    },
    settle(x: number, y: number) {
      if (!drag) return;
      measure();
      const target = targetAt(x, y);
      if (!target) return;
      drag.lastLane = target.lane;
      drag.lastRow = target.row;
      drag.changedAt = performance.now();
      if (mobile()?.targetColumn() != null) return;
      projection.setDropColumn(target.col);
      projection.setDropLine(landing(drag.cardId, target.col, target.row), drag.cardId);
    },
    cancel() {
      if (!drag) return false;
      finish(false);
      return true;
    },
    dispose() {
      clear();
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
    },
  };
}
