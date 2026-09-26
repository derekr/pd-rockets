import { dragPreviewFor } from "./visual-outlets";

export type BoardColumnReorderOptions = {
  host: HTMLElement;
  canStart?(): boolean;
  onReorder(columnId: number, to: number): void;
};

/** Opt-in pointer/step reorder; the page chooses desktop heads and mobile tab markup. */
export function installBoardColumnReorder(options: BoardColumnReorderOptions) {
  const { host } = options;
  let drag: {
    pointerId: number;
    columnId: number;
    from: number;
    to: number;
    preview: HTMLElement;
    mobile: boolean;
  } | null = null;
  const columns = (mobile: boolean) => [
    ...host.querySelectorAll<HTMLElement>(mobile ? "[data-rocket-board-mobile-column]" : "[data-rocket-board-column]"),
  ];
  const onDown = (event: PointerEvent) => {
    const grip = (event.target as Element | null)?.closest<HTMLElement>("[data-rocket-board-column-grip]");
    if (!grip || !host.contains(grip) || event.button !== 0 || drag || options.canStart?.() === false) return;
    const mobile = grip.hasAttribute("data-rocket-board-mobile-grip");
    const source = grip.closest<HTMLElement>(
      mobile ? "[data-rocket-board-mobile-column]" : "[data-rocket-board-column]",
    );
    if (!source) return;
    const from = columns(mobile).indexOf(source);
    const columnId = Number(source.dataset.col);
    if (from < 0 || !Number.isInteger(columnId)) return;
    event.preventDefault();
    host.setPointerCapture(event.pointerId);
    const rect = source.getBoundingClientRect();
    const preview = dragPreviewFor(source);
    preview.removeAttribute("id");
    preview.querySelectorAll("[id]").forEach((element) => element.removeAttribute("id"));
    preview.className = mobile ? "mobile-column-drag-preview" : "col-head column-drag-preview";
    preview.style.position = "fixed";
    preview.style.left = `${rect.left}px`;
    preview.style.top = `${rect.top}px`;
    preview.style.width = `${rect.width}px`;
    preview.style.height = `${rect.height}px`;
    preview.style.pointerEvents = "none";
    preview.style.zIndex = "1000";
    preview.inert = true;
    preview.setAttribute("aria-hidden", "true");
    document.body.append(preview);
    source.setAttribute("data-column-dragging", "");
    drag = { pointerId: event.pointerId, columnId, from, to: from, preview, mobile };
  };
  const onMove = (event: PointerEvent) => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.preview.style.left = `${event.clientX - drag.preview.offsetWidth / 2}px`;
    drag.preview.style.top = `${event.clientY - drag.preview.offsetHeight / 2}px`;
    const peers = columns(drag.mobile);
    let best = drag.to;
    let distance = Infinity;
    peers.forEach((peer, index) => {
      const rect = peer.getBoundingClientRect();
      const next = Math.abs(event.clientX - (rect.left + rect.width / 2));
      if (next < distance) {
        distance = next;
        best = index;
      }
    });
    peers.forEach((peer, index) => peer.toggleAttribute("data-column-drop-target", index === best));
    drag.to = best;
  };
  const finish = (commit: boolean) => {
    if (!drag) return;
    const current = drag;
    drag = null;
    current.preview.remove();
    for (const peer of columns(current.mobile)) {
      peer.removeAttribute("data-column-dragging");
      peer.removeAttribute("data-column-drop-target");
    }
    try {
      host.releasePointerCapture(current.pointerId);
    } catch {
      // Capture may already have been released.
    }
    if (commit && current.to !== current.from) options.onReorder(current.columnId, current.to);
  };
  const onUp = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) finish(true);
  };
  const onCancel = (event: PointerEvent) => {
    if (drag?.pointerId === event.pointerId) finish(false);
  };
  const onClick = (event: MouseEvent) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>("[data-rocket-board-column-step]");
    if (!button || !host.contains(button) || button.disabled || options.canStart?.() === false) return;
    const peers = columns(false);
    const head = button.closest<HTMLElement>("[data-rocket-board-column]");
    const from = head ? peers.indexOf(head) : -1;
    const columnId = Number(head?.dataset.col);
    const step = Number(button.dataset.rocketBoardColumnStep);
    if (from >= 0 && Number.isInteger(columnId) && (step === -1 || step === 1)) {
      options.onReorder(columnId, from + step);
    }
  };
  host.addEventListener("pointerdown", onDown);
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerup", onUp);
  host.addEventListener("pointercancel", onCancel);
  host.addEventListener("click", onClick);
  return {
    cancel() {
      if (!drag) return false;
      finish(false);
      return true;
    },
    dispose() {
      finish(false);
      host.removeEventListener("pointerdown", onDown);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerup", onUp);
      host.removeEventListener("pointercancel", onCancel);
      host.removeEventListener("click", onClick);
    },
  };
}
