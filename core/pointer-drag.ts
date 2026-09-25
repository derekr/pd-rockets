import { createDragState } from "./drag-state";

export type PointerDragOptions<ItemId, Target> = {
  host: HTMLElement;
  itemSelector: string;
  itemId: (item: HTMLElement) => ItemId | null;
  canStart?: (event: PointerEvent, item: HTMLElement) => boolean;
  targetAt: (x: number, y: number, itemId: ItemId) => Target | null;
  mark: (target: Target | null, itemId?: ItemId) => void;
  retainPreviewOnCommit?: boolean;
  beforeCommit?: (itemId: ItemId, rect: { left: number; top: number }) => void;
  commit: (itemId: ItemId, target: Target) => void;
};

/** Shared pointer lifecycle; target geometry and semantic commit stay domain-owned. */
export function installPointerDrag<ItemId, Target>(options: PointerDragOptions<ItemId, Target>): () => void {
  const state = createDragState<ItemId, Target>();
  let active: { itemId: ItemId; pointerId: number } | null = null;
  let preview: HTMLElement | null = null;
  let previewOffset = { x: 0, y: 0 };

  const movePreview = (event: PointerEvent): void => {
    if (!preview) return;
    preview.style.left = `${event.clientX - previewOffset.x}px`;
    preview.style.top = `${event.clientY - previewOffset.y}px`;
  };

  const clearPreview = (): void => {
    preview?.remove();
    preview = null;
  };

  const finish = (target: Target | null, cancelled: boolean): void => {
    const current = active;
    const previewPosition = preview && { left: parseFloat(preview.style.left), top: parseFloat(preview.style.top) };
    active = null;
    if (!target || cancelled || !options.retainPreviewOnCommit) options.mark(null, current?.itemId);
    clearPreview();
    options.host.removeAttribute("data-drag-active");
    options.host
      .querySelectorAll<HTMLElement>("[data-dragging]")
      .forEach((item) => item.removeAttribute("data-dragging"));
    if (!current) return;
    try {
      options.host.releasePointerCapture?.(current.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }
    if (cancelled) {
      state.send({ type: "cancel" });
      return;
    }
    if (target) {
      state.send({ type: "preview", target });
      state.send({ type: "commit", target });
      if (previewPosition) options.beforeCommit?.(current.itemId, previewPosition);
      options.commit(current.itemId, target);
    } else {
      state.send({ type: "cancel" });
    }
  };

  const onMove = (event: Event): void => {
    if (!active || (event as PointerEvent).pointerId !== active.pointerId) return;
    const pointer = event as PointerEvent;
    movePreview(pointer);
    const target = options.targetAt(pointer.clientX, pointer.clientY, active.itemId);
    state.send({ type: "preview", target });
    options.mark(target, active.itemId);
  };
  const onUp = (event: Event): void => {
    if (!active || (event as PointerEvent).pointerId !== active.pointerId) return;
    const pointer = event as PointerEvent;
    movePreview(pointer);
    finish(options.targetAt(pointer.clientX, pointer.clientY, active.itemId), false);
  };
  const onCancel = (event: Event): void => {
    if (!active || (event as PointerEvent).pointerId !== active.pointerId) return;
    finish(null, true);
  };
  const onDown = (event: Event): void => {
    const pointer = event as PointerEvent;
    if (pointer.button !== 0 || active) return;
    const item = (pointer.target as HTMLElement).closest<HTMLElement>(options.itemSelector);
    const itemId = item && options.host.contains(item) ? options.itemId(item) : null;
    if (!item || itemId === null || (options.canStart && !options.canStart(pointer, item))) return;
    active = { itemId, pointerId: pointer.pointerId };
    state.send({ type: "begin", itemId });
    options.host.setAttribute("data-drag-active", "");
    item.setAttribute("data-dragging", "true");
    const rect = item.getBoundingClientRect();
    previewOffset = { x: pointer.clientX - rect.left, y: pointer.clientY - rect.top };
    preview = item.cloneNode(true) as HTMLElement;
    preview.removeAttribute("id");
    preview.setAttribute("data-drag-preview", "true");
    preview.style.position = "fixed";
    preview.style.left = `${rect.left}px`;
    preview.style.top = `${rect.top}px`;
    preview.style.boxSizing = "border-box";
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "1000";
    document.body.append(preview);
    options.host.setPointerCapture?.(pointer.pointerId);
  };

  options.host.addEventListener("pointerdown", onDown);
  options.host.addEventListener("pointermove", onMove);
  options.host.addEventListener("pointerup", onUp);
  options.host.addEventListener("pointercancel", onCancel);
  return () => {
    finish(null, true);
    options.host.removeEventListener("pointerdown", onDown);
    options.host.removeEventListener("pointermove", onMove);
    options.host.removeEventListener("pointerup", onUp);
    options.host.removeEventListener("pointercancel", onCancel);
    options.host
      .querySelectorAll<HTMLElement>("[data-dragging]")
      .forEach((item) => item.removeAttribute("data-dragging"));
  };
}
