// @ts-ignore — the browser bundle resolves the vendored Rocket module at this URL.
import { rocket } from "/js/datastar-rocket.js";
import { bentoContract, type BentoMoveDetail, type BentoPosition, type BentoResizeDetail } from "../../contracts/bento";
import { installFlip } from "../../core/flip";
import { keyMatches } from "../../core/keyboard";
import { installPointerDrag } from "../../core/pointer-drag";
import { projectBentoLayout, type Cell, type GridLayout } from "./placement";

type Target = Cell & { grid: HTMLElement; gridId: string };

rocket(bentoContract.tag, {
  mode: "light",
  setup({ host, cleanup }: { host: HTMLElement; cleanup: (fn: () => void) => void }) {
    const { grid: gridSelector, item: itemSelector, resize: resizeSelector } = bentoContract.selectors;
    const owns = (element: HTMLElement) => element.closest(bentoContract.tag) === host;
    const grids = () => [...host.querySelectorAll<HTMLElement>(gridSelector)].filter(owns);
    const itemId = (item: HTMLElement) => (owns(item) ? (item.dataset.bentoItem ?? null) : null);
    const cells = (item: HTMLElement): Cell => ({
      col: Number(item.dataset.bentoCol ?? 1),
      row: Number(item.dataset.bentoRow ?? 1),
      width: Number(item.dataset.bentoWidth ?? 1),
      height: Number(item.dataset.bentoHeight ?? 1),
    });
    const columns = (grid: HTMLElement) => Math.max(1, Number(grid.dataset.columns ?? 4));
    const metrics = (grid: HTMLElement) => {
      const style = getComputedStyle(grid);
      const rect = grid.getBoundingClientRect();
      const gapX = parseFloat(style.columnGap) || 0;
      const gapY = parseFloat(style.rowGap) || 0;
      const left = rect.left + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.paddingLeft) || 0);
      const top = rect.top + (parseFloat(style.borderTopWidth) || 0) + (parseFloat(style.paddingTop) || 0);
      const contentWidth =
        rect.width -
        (parseFloat(style.borderLeftWidth) || 0) -
        (parseFloat(style.borderRightWidth) || 0) -
        (parseFloat(style.paddingLeft) || 0) -
        (parseFloat(style.paddingRight) || 0);
      return {
        left,
        top,
        gapX,
        gapY,
        cellWidth: (contentWidth - gapX * (columns(grid) - 1)) / columns(grid),
        cellHeight: parseFloat(style.gridAutoRows) || 80,
      };
    };
    const flip = installFlip({ host, itemSelector, itemId });
    let marker: HTMLElement | null = null;
    let previewKey = "";
    let previewUpdates: BentoPosition[] = [];
    let pendingTimer: ReturnType<typeof setTimeout> | null = null;
    const originalTransforms = new Map<HTMLElement, string>();
    let stretchedGrid: { element: HTMLElement; minHeight: string } | null = null;
    let projectedItem: HTMLElement | null = null;
    const layout = (): GridLayout[] =>
      grids().map((grid) => ({
        id: grid.dataset.bentoGrid ?? "",
        columns: columns(grid),
        items: [...grid.querySelectorAll<HTMLElement>(itemSelector)].filter(owns).map((item) => ({
          id: item.dataset.bentoItem ?? "",
          ...cells(item),
        })),
      }));
    const clearProjection = () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = null;
      marker?.remove();
      marker = null;
      previewKey = "";
      previewUpdates = [];
      for (const [item, transform] of originalTransforms) item.style.transform = transform;
      originalTransforms.clear();
      projectedItem?.removeAttribute("data-bento-projecting");
      projectedItem = null;
      if (stretchedGrid) stretchedGrid.element.style.minHeight = stretchedGrid.minHeight;
      stretchedGrid = null;
    };
    const mark = (target: Target | null, id?: string) => {
      if (!target || !id) {
        clearProjection();
        return;
      }
      const key = `${id}:${target.gridId}:${target.col}:${target.row}:${target.width}:${target.height}`;
      if (key === previewKey) return;
      clearProjection();
      previewKey = key;
      previewUpdates = projectBentoLayout(layout(), id, target.gridId, target);
      marker = document.createElement("div");
      marker.setAttribute("data-bento-target", "");
      marker.style.gridColumn = `${target.col} / span ${target.width}`;
      marker.style.gridRow = `${target.row} / span ${target.height}`;
      target.grid.append(marker);
      const { cellWidth, cellHeight, gapX, gapY } = metrics(target.grid);
      for (const update of previewUpdates) {
        const item = [...host.querySelectorAll<HTMLElement>(itemSelector)].find(
          (candidate) => itemId(candidate) === update.itemId,
        );
        if (!item) continue;
        if (update.itemId === id) {
          item.setAttribute("data-bento-projecting", "");
          projectedItem = item;
          continue;
        }
        const original = cells(item);
        originalTransforms.set(item, item.style.transform);
        item.style.transform =
          `translate(${(update.col - original.col) * (cellWidth + gapX)}px, ${(update.row - original.row) * (cellHeight + gapY)}px) ${item.style.transform}`.trim();
      }
      const furthestRow = Math.max(
        target.row + target.height - 1,
        ...previewUpdates.map((update) => update.row + update.height - 1),
      );
      const style = getComputedStyle(target.grid);
      stretchedGrid = { element: target.grid, minHeight: target.grid.style.minHeight };
      target.grid.style.minHeight = `${Math.max(
        parseFloat(style.minHeight) || 0,
        furthestRow * (cellHeight + gapY) -
          gapY +
          (parseFloat(style.paddingTop) || 0) +
          (parseFloat(style.paddingBottom) || 0) +
          (parseFloat(style.borderTopWidth) || 0) +
          (parseFloat(style.borderBottomWidth) || 0),
      )}px`;
    };
    const gridFor = (item: HTMLElement) => item.closest<HTMLElement>(gridSelector);
    const targetAt = (x: number, y: number, id: string): Target | null => {
      const grid = document.elementFromPoint(x, y)?.closest<HTMLElement>(gridSelector);
      const item = [...host.querySelectorAll<HTMLElement>(itemSelector)].find((candidate) => itemId(candidate) === id);
      if (!grid || !owns(grid) || !item || grid.dataset.bentoGrid === undefined) return null;
      const { left, top, gapX, gapY, cellWidth, cellHeight } = metrics(grid);
      const size = cells(item);
      const width = Math.min(size.width, columns(grid));
      return {
        grid,
        gridId: grid.dataset.bentoGrid,
        col: Math.max(1, Math.min(columns(grid) - width + 1, Math.floor((x - left) / (cellWidth + gapX)) + 1)),
        row: Math.max(1, Math.floor((y - top) / (cellHeight + gapY)) + 1),
        width,
        height: size.height,
      };
    };
    const finishPreview = () => {
      if (pendingTimer) clearTimeout(pendingTimer);
      pendingTimer = setTimeout(clearProjection, 2000);
    };
    const emitMove = (id: string, target: Target) => {
      const item = [...host.querySelectorAll<HTMLElement>(itemSelector)].find((candidate) => itemId(candidate) === id);
      const fromGrid = item && gridFor(item)?.dataset.bentoGrid;
      if (fromGrid === undefined) return;
      if (!previewUpdates.length) {
        clearProjection();
        return;
      }
      host.dispatchEvent(
        new CustomEvent<BentoMoveDetail>(bentoContract.events.move, {
          bubbles: true,
          composed: true,
          detail: {
            itemId: id,
            fromGrid,
            toGrid: target.gridId,
            updates: previewUpdates,
          },
        }),
      );
      finishPreview();
    };
    const emitResize = (id: string, target: Target) => {
      if (!previewUpdates.length) {
        clearProjection();
        return;
      }
      host.dispatchEvent(
        new CustomEvent<BentoResizeDetail>(bentoContract.events.resize, {
          bubbles: true,
          composed: true,
          detail: { itemId: id, grid: target.gridId, updates: previewUpdates },
        }),
      );
      finishPreview();
    };
    const pointerDispose = installPointerDrag({
      host,
      itemSelector,
      itemId,
      targetAt,
      mark,
      retainPreviewOnCommit: true,
      canStart: (event) => !(event.target as HTMLElement).closest(resizeSelector),
      beforeCommit: flip.prepare,
      commit: emitMove,
    });

    let resizing: {
      item: HTMLElement;
      pointerId: number;
      x: number;
      y: number;
      origin: Target;
      target: Target;
    } | null = null;
    const clearResize = () => {
      if (resizing) {
        resizing.item.removeAttribute("data-bento-resizing");
        try {
          host.releasePointerCapture?.(resizing.pointerId);
        } catch {
          /* Already released. */
        }
      }
      resizing = null;
      host.removeAttribute("data-resize-active");
      mark(null);
    };
    const onPointerDown = (event: PointerEvent) => {
      if (staged) clearStage();
      const handle = (event.target as HTMLElement).closest<HTMLElement>(resizeSelector);
      const item = handle?.closest<HTMLElement>(itemSelector);
      const grid = item && gridFor(item);
      if (!handle || !item || !grid || !owns(item) || event.button !== 0 || resizing) return;
      event.preventDefault();
      const target = { grid, gridId: grid.dataset.bentoGrid ?? "", ...cells(item) };
      resizing = { item, pointerId: event.pointerId, x: event.clientX, y: event.clientY, origin: target, target };
      item.setAttribute("data-bento-resizing", "");
      host.setAttribute("data-resize-active", "");
      host.setPointerCapture?.(event.pointerId);
      mark(target, item.dataset.bentoItem);
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!resizing || resizing.pointerId !== event.pointerId) return;
      const { cellWidth, cellHeight, gapX, gapY } = metrics(resizing.origin.grid);
      resizing.target = {
        ...resizing.origin,
        width: Math.max(
          1,
          Math.min(
            columns(resizing.origin.grid) - resizing.origin.col + 1,
            resizing.origin.width + Math.round((event.clientX - resizing.x) / (cellWidth + gapX)),
          ),
        ),
        height: Math.max(
          1,
          Math.min(5, resizing.origin.height + Math.round((event.clientY - resizing.y) / (cellHeight + gapY))),
        ),
      };
      mark(resizing.target, resizing.item.dataset.bentoItem);
    };
    const onPointerUp = (event: PointerEvent) => {
      if (!resizing || resizing.pointerId !== event.pointerId) return;
      const { item, origin, target } = resizing;
      if (origin.width === target.width && origin.height === target.height) {
        clearResize();
        return;
      }
      resizing.item.removeAttribute("data-bento-resizing");
      try {
        host.releasePointerCapture?.(resizing.pointerId);
      } catch {
        /* Already released. */
      }
      resizing = null;
      host.removeAttribute("data-resize-active");
      flip.prepare();
      emitResize(item.dataset.bentoItem ?? "", target);
    };
    const onPointerCancel = (event: PointerEvent) => {
      if (resizing?.pointerId === event.pointerId) clearResize();
    };

    let staged: { id: string; target: Target; kind: "move" | "resize" } | null = null;
    let focusId: string | null = null;
    let focusTimer: ReturnType<typeof setInterval> | null = null;
    let focusExpiry: ReturnType<typeof setTimeout> | null = null;
    const clearStage = () => {
      staged = null;
      host.removeAttribute("data-key-staging");
      mark(null);
    };
    const commitStage = () => {
      if (!staged) return;
      const { id, target, kind } = staged;
      staged = null;
      host.removeAttribute("data-key-staging");
      focusId = id;
      if (focusTimer) clearInterval(focusTimer);
      if (focusExpiry) clearTimeout(focusExpiry);
      focusTimer = setInterval(() => {
        const item = [...host.querySelectorAll<HTMLElement>(itemSelector)].find(
          (candidate) => itemId(candidate) === focusId,
        );
        if (!item || gridFor(item)?.dataset.bentoGrid !== target.gridId) return;
        if (
          cells(item).col !== target.col ||
          cells(item).row !== target.row ||
          cells(item).width !== target.width ||
          cells(item).height !== target.height
        )
          return;
        item.focus({ preventScroll: true });
        focusId = null;
        if (focusTimer) clearInterval(focusTimer);
        if (focusExpiry) clearTimeout(focusExpiry);
        focusTimer = null;
        focusExpiry = null;
      }, 30);
      focusExpiry = setTimeout(() => {
        focusId = null;
        if (focusTimer) clearInterval(focusTimer);
        focusTimer = null;
        focusExpiry = null;
      }, 2000);
      flip.prepare();
      if (kind === "move") emitMove(id, target);
      else emitResize(id, target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(itemSelector);
      const id = item && itemId(item);
      if (!item || !id) return;
      if (event.key === "Escape") {
        if (staged) event.preventDefault();
        clearStage();
        return;
      }
      const move = event.altKey && !event.shiftKey;
      const resize = event.shiftKey && !event.altKey && !event.ctrlKey && !event.metaKey;
      if (!move && !resize) return;
      const dx =
        keyMatches(move ? "Alt+ArrowLeft" : "Shift+ArrowLeft", event) || (move && keyMatches("Alt+h", event))
          ? -1
          : keyMatches(move ? "Alt+ArrowRight" : "Shift+ArrowRight", event) || (move && keyMatches("Alt+l", event))
            ? 1
            : 0;
      const dy =
        keyMatches(move ? "Alt+ArrowUp" : "Shift+ArrowUp", event) || (move && keyMatches("Alt+k", event))
          ? -1
          : keyMatches(move ? "Alt+ArrowDown" : "Shift+ArrowDown", event) || (move && keyMatches("Alt+j", event))
            ? 1
            : 0;
      const gridDirection = move && event.key === "PageUp" ? -1 : move && event.key === "PageDown" ? 1 : 0;
      if (!dx && !dy && !gridDirection) return;
      event.preventDefault();
      const sourceGrid = gridFor(item);
      const current = staged?.id === id && staged.kind === (move ? "move" : "resize") ? staged.target : null;
      const currentGrid = current?.grid ?? sourceGrid;
      const allGrids = grids();
      const targetGrid = currentGrid && allGrids[allGrids.indexOf(currentGrid) + gridDirection];
      if (!targetGrid) return;
      const origin = current ?? { grid: targetGrid, gridId: targetGrid.dataset.bentoGrid ?? "", ...cells(item) };
      const width = resize
        ? Math.max(1, Math.min(columns(targetGrid) - origin.col + 1, origin.width + dx))
        : Math.min(origin.width, columns(targetGrid));
      const target: Target = {
        grid: targetGrid,
        gridId: targetGrid.dataset.bentoGrid ?? "",
        col: resize ? origin.col : Math.max(1, Math.min(columns(targetGrid) - width + 1, origin.col + dx)),
        row: resize ? origin.row : Math.max(1, origin.row + dy),
        width,
        height: resize ? Math.max(1, Math.min(5, origin.height + dy)) : origin.height,
      };
      if (gridDirection) {
        target.col = 1;
        target.row = 1;
      }
      if (
        !gridDirection &&
        target.col === origin.col &&
        target.row === origin.row &&
        target.width === origin.width &&
        target.height === origin.height
      )
        return;
      staged = { id, target, kind: move ? "move" : "resize" };
      host.setAttribute("data-key-staging", "");
      mark(target, id);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if ((staged?.kind === "move" && event.key === "Alt") || (staged?.kind === "resize" && event.key === "Shift"))
        commitStage();
    };
    host.addEventListener("pointerdown", onPointerDown);
    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerup", onPointerUp);
    host.addEventListener("pointercancel", onPointerCancel);
    host.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", commitStage);
    cleanup(() => {
      clearStage();
      clearResize();
      clearProjection();
      pointerDispose();
      flip.dispose();
      if (focusTimer) clearInterval(focusTimer);
      if (focusExpiry) clearTimeout(focusExpiry);
      host.removeEventListener("pointerdown", onPointerDown);
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerup", onPointerUp);
      host.removeEventListener("pointercancel", onPointerCancel);
      host.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", commitStage);
    });
  },
});
