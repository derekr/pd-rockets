// @ts-ignore — the browser bundle resolves the vendored Rocket module at this URL.
import { rocket } from "/js/datastar-rocket.js";
import { dragGroupContract, type DragGroupMoveDetail } from "../../contracts/drag-group";
import { installFlip } from "../../core/flip";
import { insertionBefore } from "../../core/insertion-target";
import { keyMatches } from "../../core/keyboard";
import { installPointerDrag } from "../../core/pointer-drag";

type Target = { list: HTMLElement; toList: string; before: string };

rocket(dragGroupContract.tag, {
  mode: "light",
  setup({ host, cleanup }: { host: HTMLElement; cleanup: (fn: () => void) => void }) {
    const { list: listSelector, item: itemSelector } = dragGroupContract.selectors;
    const owns = (element: HTMLElement): boolean => element.closest(dragGroupContract.tag) === host;
    const itemId = (item: HTMLElement): string | null =>
      owns(item) && item.closest(listSelector) ? (item.dataset.dragItem ?? null) : null;
    const lists = () => [...host.querySelectorAll<HTMLElement>(listSelector)].filter(owns);
    const itemsIn = (list: HTMLElement) =>
      [...list.querySelectorAll<HTMLElement>(itemSelector)].filter(
        (item) => owns(item) && item.closest(listSelector) === list,
      );
    const flip = installFlip({ host, itemSelector, itemId });

    const targetAt = (x: number, y: number, sourceId: string): Target | null => {
      const hit = document.elementFromPoint(x, y);
      const list = hit?.closest<HTMLElement>(listSelector);
      if (!list || !owns(list) || list.dataset.dropList === undefined) return null;
      const candidates = itemsIn(list)
        .filter((item) => item.dataset.dragItem !== sourceId)
        .map((item) => {
          const rect = item.getBoundingClientRect();
          return { id: item.dataset.dragItem ?? "", top: rect.top, bottom: rect.bottom };
        });
      return { list, toList: list.dataset.dropList, before: insertionBefore(candidates, y) };
    };
    const mark = (target: Target | null): void => {
      lists().forEach((list) => {
        itemsIn(list).forEach((item) => item.removeAttribute("data-drop-before"));
        list.removeAttribute("data-drop-active");
        list.removeAttribute("data-drop-end");
      });
      if (!target) return;
      target.list.setAttribute("data-drop-active", "");
      if (target.before) {
        itemsIn(target.list)
          .find((item) => item.dataset.dragItem === target.before)
          ?.setAttribute("data-drop-before", "");
      } else {
        target.list.setAttribute("data-drop-end", "");
      }
    };
    const emitMove = (id: string, target: Target) => {
      const source = [...host.querySelectorAll<HTMLElement>(itemSelector)].find((item) => itemId(item) === id);
      const fromList = source?.closest<HTMLElement>(listSelector)?.dataset.dropList;
      if (fromList === undefined) return;
      host.dispatchEvent(
        new CustomEvent<DragGroupMoveDetail>(dragGroupContract.events.move, {
          bubbles: true,
          composed: true,
          detail: { itemId: id, fromList, toList: target.toList, before: target.before },
        }),
      );
    };
    let staged: { itemId: string; target: Target } | null = null;
    let focusTarget: { itemId: string; target: Target } | null = null;
    let focusInterval: ReturnType<typeof setInterval> | null = null;
    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    const restoreFocus = () => {
      if (!focusTarget) return;
      const { itemId: id, target } = focusTarget;
      const destination = lists().find((list) => list.dataset.dropList === target.toList);
      if (!destination) return;
      const items = itemsIn(destination);
      const index = items.findIndex((item) => item.dataset.dragItem === id);
      if (index < 0 || (items[index + 1]?.dataset.dragItem ?? "") !== target.before) return;
      items[index]?.focus({ preventScroll: true });
      focusTarget = null;
      if (focusInterval) clearInterval(focusInterval);
      if (focusTimeout) clearTimeout(focusTimeout);
      focusInterval = null;
      focusTimeout = null;
    };
    const cancelStaged = () => {
      staged = null;
      mark(null);
      host.removeAttribute("data-key-staging");
    };
    const commitStaged = () => {
      if (!staged) return;
      const { itemId: id, target } = staged;
      cancelStaged();
      focusTarget = { itemId: id, target };
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
      emitMove(id, target);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const item = (event.target as HTMLElement).closest<HTMLElement>(itemSelector);
      const id = item && itemId(item);
      if (!item || !id) return;
      if (event.key === "Escape") {
        if (staged) event.preventDefault();
        cancelStaged();
        return;
      }
      const horizontal =
        keyMatches("Alt+ArrowLeft", event) || keyMatches("Alt+h", event)
          ? -1
          : keyMatches("Alt+ArrowRight", event) || keyMatches("Alt+l", event)
            ? 1
            : 0;
      const vertical =
        keyMatches("Alt+ArrowUp", event) || keyMatches("Alt+k", event)
          ? -1
          : keyMatches("Alt+ArrowDown", event) || keyMatches("Alt+j", event)
            ? 1
            : 0;
      if (!horizontal && !vertical) return;
      event.preventDefault();
      const sourceList = item.closest<HTMLElement>(listSelector);
      const stagedTarget = staged?.itemId === id ? staged.target : null;
      const currentList = stagedTarget?.list ?? sourceList;
      const allLists = lists();
      const list = currentList && allLists[allLists.indexOf(currentList) + horizontal];
      if (!list) return;
      let before = "";
      if (vertical) {
        const candidates = itemsIn(list).filter((candidate) => candidate !== item);
        const position = stagedTarget
          ? stagedTarget.before
            ? candidates.findIndex((candidate) => candidate.dataset.dragItem === stagedTarget.before)
            : candidates.length
          : itemsIn(list).indexOf(item);
        const nextPosition = Math.max(0, Math.min(candidates.length, position + vertical));
        if (nextPosition === position) return;
        before = candidates[nextPosition]?.dataset.dragItem ?? "";
      }
      staged = { itemId: id, target: { list, toList: list.dataset.dropList ?? "", before } };
      mark(staged.target);
      host.setAttribute("data-key-staging", "");
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") commitStaged();
    };
    const onPointerDown = () => cancelStaged();
    const dispose = installPointerDrag({
      host,
      itemSelector,
      itemId,
      targetAt,
      mark,
      beforeCommit: (id, rect) => flip.prepare({ itemId: id, rect }),
      commit: emitMove,
    });
    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", commitStaged);
    cleanup(() => {
      cancelStaged();
      if (focusInterval) clearInterval(focusInterval);
      if (focusTimeout) clearTimeout(focusTimeout);
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", commitStaged);
      dispose();
      flip.dispose();
    });
  },
});
