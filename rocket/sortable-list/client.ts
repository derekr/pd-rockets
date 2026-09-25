// @ts-ignore — the browser bundle resolves the vendored Rocket module at this URL.
import { rocket } from "/js/datastar-rocket.js";
import { installFlip } from "../../core/flip";
import { insertionBefore } from "../../core/insertion-target";
import { keyMatches } from "../../core/keyboard";
import { installPointerDrag } from "../../core/pointer-drag";
import { sortableListContract, type SortableMoveDetail } from "../../contracts/sortable-list";

rocket(sortableListContract.tag, {
  mode: "light",
  setup({ host, cleanup }: { host: HTMLElement; cleanup: (fn: () => void) => void }) {
    const itemId = (item: HTMLElement): string | null => item.dataset.sortableItem ?? null;
    const flip = installFlip({ host, itemSelector: sortableListContract.selectors.item, itemId });
    const targetAt = (x: number, y: number, sourceId: string) => {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !host.contains(hit)) return null;
      const candidates = [...host.querySelectorAll<HTMLElement>(sortableListContract.selectors.item)]
        .filter((item) => item.dataset.sortableItem !== sourceId)
        .map((item) => {
          const rect = item.getBoundingClientRect();
          return { id: item.dataset.sortableItem ?? "", top: rect.top, bottom: rect.bottom };
        });
      return { before: insertionBefore(candidates, y) };
    };
    const mark = (target: { before: string } | null) => {
      host.querySelectorAll<HTMLElement>(sortableListContract.selectors.item).forEach((item) => {
        item.toggleAttribute("data-drop-before", target?.before !== "" && item.dataset.sortableItem === target?.before);
      });
      host.toggleAttribute("data-drop-end", target !== null && target.before === "");
    };
    const items = () => [...host.querySelectorAll<HTMLElement>(sortableListContract.selectors.item)];
    const emitMove = (id: string, target: { before: string }) => {
      host.dispatchEvent(
        new CustomEvent<SortableMoveDetail>(sortableListContract.events.move, {
          bubbles: true,
          composed: true,
          detail: { itemId: id, before: target.before },
        }),
      );
    };
    let staged: { id: string; before: string } | null = null;
    let focusTarget: { id: string; before: string } | null = null;
    let focusInterval: ReturnType<typeof setInterval> | null = null;
    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    const restoreFocus = () => {
      if (!focusTarget) return;
      const all = items();
      const index = all.findIndex((item) => item.dataset.sortableItem === focusTarget?.id);
      if (index < 0 || (all[index + 1]?.dataset.sortableItem ?? "") !== focusTarget.before) return;
      all[index]?.focus({ preventScroll: true });
      focusTarget = null;
      if (focusInterval) clearInterval(focusInterval);
      if (focusTimeout) clearTimeout(focusTimeout);
      focusInterval = null;
      focusTimeout = null;
    };
    const clearStage = () => {
      staged = null;
      mark(null);
      host.removeAttribute("data-key-staging");
    };
    const commitStage = () => {
      if (!staged) return;
      const { id, before } = staged;
      clearStage();
      focusTarget = { id, before };
      if (focusInterval) clearInterval(focusInterval);
      if (focusTimeout) clearTimeout(focusTimeout);
      focusInterval = setInterval(restoreFocus, 30);
      focusTimeout = setTimeout(() => {
        focusTarget = null;
        if (focusInterval) clearInterval(focusInterval);
        focusInterval = null;
        focusTimeout = null;
      }, 2000);
      flip.prepare();
      emitMove(id, { before });
    };
    const dispose = installPointerDrag({
      host,
      itemSelector: sortableListContract.selectors.item,
      itemId,
      targetAt,
      mark,
      beforeCommit: (id, rect) => flip.prepare({ itemId: id, rect }),
      commit: emitMove,
    });
    const onKeyDown = (event: KeyboardEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(sortableListContract.selectors.item);
      if (!item || !host.contains(item)) return;
      if (event.key === "Escape") {
        if (staged) event.preventDefault();
        clearStage();
        return;
      }
      const all = items();
      const index = all.indexOf(item);
      if (!event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        const next =
          event.key === "ArrowDown"
            ? all[index + 1]
            : event.key === "ArrowUp"
              ? all[index - 1]
              : event.key === "Home"
                ? all[0]
                : event.key === "End"
                  ? all.at(-1)
                  : null;
        if (next) {
          event.preventDefault();
          next.focus();
        }
        return;
      }
      const direction =
        keyMatches("Alt+ArrowUp", event) || keyMatches("Alt+k", event)
          ? -1
          : keyMatches("Alt+ArrowDown", event) || keyMatches("Alt+j", event)
            ? 1
            : 0;
      if (!direction) return;
      event.preventDefault();
      const id = itemId(item);
      if (!id) return;
      const candidates = all.filter((candidate) => candidate !== item);
      const position =
        staged?.id === id
          ? staged.before
            ? candidates.findIndex((candidate) => itemId(candidate) === staged?.before)
            : candidates.length
          : index;
      const nextPosition = Math.max(0, Math.min(candidates.length, position + direction));
      if (nextPosition === position) return;
      staged = { id, before: candidates[nextPosition]?.dataset.sortableItem ?? "" };
      host.setAttribute("data-key-staging", "");
      mark(staged);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") commitStage();
    };
    const onPointerDown = () => clearStage();
    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", commitStage);
    cleanup(() => {
      clearStage();
      if (focusInterval) clearInterval(focusInterval);
      if (focusTimeout) clearTimeout(focusTimeout);
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", commitStage);
      dispose();
      flip.dispose();
    });
  },
});
