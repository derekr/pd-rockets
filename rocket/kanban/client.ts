// @ts-ignore — the browser bundle resolves the vendored Rocket module at this URL.
import { rocket } from "/js/datastar-rocket.js";
import { installFlip } from "../../core/flip";
import { installFocusRecovery } from "../../core/focus-recovery";
import { insertionBefore } from "../../core/insertion-target";
import { keyMatches } from "../../core/keyboard";
import { markRocketHost, ownsRocketElement } from "../../core/ownership";
import { installPointerDrag } from "../../core/pointer-drag";
import { kanbanContract, kanbanKeyboardConfig, type KanbanMoveDetail } from "../../contracts/kanban";

type Target = { col: number; before: string; lane: HTMLElement };

function datasetKey(slot: string): keyof DOMStringMap {
  return `key${slot[0]!.toUpperCase()}${slot.slice(1)}` as keyof DOMStringMap;
}

rocket(kanbanContract.tag, {
  mode: "light",
  setup({ host, cleanup }: { host: HTMLElement; cleanup: (fn: () => void) => void }) {
    cleanup(markRocketHost(host));
    const keyboardOverrides = Object.fromEntries(
      [
        "selectNext",
        "selectPrevious",
        "selectLeft",
        "selectRight",
        "moveUp",
        "moveDown",
        "moveLeft",
        "moveRight",
        "cancel",
      ].flatMap((slot) => {
        const value = host.dataset[datasetKey(slot)];
        return value === undefined ? [] : [[slot, value.split(" ").filter(Boolean)]];
      }),
    );
    const keyboard = kanbanKeyboardConfig(keyboardOverrides);
    const owns = (element: HTMLElement) => ownsRocketElement(host, element);
    const cards = () => [...host.querySelectorAll<HTMLElement>(kanbanContract.selectors.card)].filter(owns);
    const lanes = () => [...host.querySelectorAll<HTMLElement>(kanbanContract.selectors.lane)].filter(owns);
    const cardsIn = (lane: HTMLElement) =>
      [...lane.querySelectorAll<HTMLElement>(kanbanContract.selectors.card)].filter(owns);
    const focus = installFocusRecovery(host);
    let staged: { itemId: string; target: Target; releaseKey: string } | null = null;
    const flip = installFlip({
      host,
      itemSelector: kanbanContract.selectors.card,
      itemId: (card) => (owns(card) ? (card.dataset.kanbanCard ?? null) : null),
    });
    const clearMarks = () => {
      cards().forEach((card) => card.removeAttribute("data-drop-before"));
      lanes().forEach((lane) => {
        lane.removeAttribute("data-drop-active");
        lane.querySelector("[data-kanban-lane-cards]")?.removeAttribute("data-drop-end");
      });
    };
    const clearDragging = () => cards().forEach((card) => card.removeAttribute("data-dragging"));
    const markTarget = (target: Target | null): void => {
      clearMarks();
      if (!target) return;
      target.lane.setAttribute("data-drop-active", "true");
      if (target.before) {
        cardsIn(target.lane)
          .find((card) => card.dataset.kanbanCard === target.before)
          ?.setAttribute("data-drop-before", "");
      } else {
        target.lane.querySelector("[data-kanban-lane-cards]")?.setAttribute("data-drop-end", "");
      }
    };
    const select = (card: HTMLElement | undefined): void => {
      if (!card) return;
      card.focus();
      host.dispatchEvent(
        new CustomEvent(kanbanContract.events.select, {
          bubbles: true,
          composed: true,
          detail: { cardId: card.dataset.kanbanCard ?? "" },
        }),
      );
    };
    const targetAt = (x: number, y: number, itemId: string): Target | null => {
      const lane = document.elementFromPoint(x, y)?.closest<HTMLElement>(kanbanContract.selectors.lane);
      if (!lane || !owns(lane)) return null;
      const candidates = cardsIn(lane)
        .filter((card) => card.dataset.kanbanCard !== itemId)
        .map((card) => {
          const rect = card.getBoundingClientRect();
          return { id: card.dataset.kanbanCard ?? "", top: rect.top, bottom: rect.bottom };
        });
      const before = insertionBefore(candidates, y);
      return { col: Number(lane.dataset.col ?? 0), before, lane };
    };
    const emitMove = (itemId: string, target: Target) => {
      host.dispatchEvent(
        new CustomEvent<KanbanMoveDetail>(kanbanContract.events.move, {
          bubbles: true,
          composed: true,
          detail: { cardId: itemId, col: target.col, before: target.before },
        }),
      );
    };
    const cancelStaged = () => {
      staged = null;
      clearMarks();
      host.removeAttribute("data-key-staging");
    };
    const commitStaged = () => {
      if (!staged) return;
      const { itemId, target } = staged;
      cancelStaged();
      const source = cards().find((card) => card.dataset.kanbanCard === itemId);
      if (source)
        focus.expect(source, () => {
          const card = cards().find((candidate) => candidate.dataset.kanbanCard === itemId);
          const lane = card?.closest<HTMLElement>(kanbanContract.selectors.lane);
          if (!card || !lane || Number(lane.dataset.col) !== target.col) return null;
          const siblings = cardsIn(lane);
          return (siblings[siblings.indexOf(card) + 1]?.dataset.kanbanCard ?? "") === target.before ? card : null;
        });
      flip.prepare();
      emitMove(itemId, target);
    };
    const pointerDispose = installPointerDrag({
      host,
      itemSelector: kanbanContract.selectors.card,
      interactiveHandle: kanbanContract.selectors.cardMain,
      itemId: (card) => (owns(card) ? (card.dataset.kanbanCard ?? null) : null),
      targetAt,
      mark: markTarget,
      beforeCommit: (id, rect) => flip.prepare({ itemId: id, rect }),
      commit: emitMove,
    });
    const onKeyDown = (event: Event) => {
      const keyEvent = event as KeyboardEvent;
      if (!owns(keyEvent.target as HTMLElement)) return;
      const card = (keyEvent.target as HTMLElement).closest<HTMLElement>(kanbanContract.selectors.card);
      const itemId = card?.dataset.kanbanCard;
      if (!card || !owns(card) || !itemId) return;
      if (keyboard.cancel.some((key) => keyMatches(key, keyEvent))) {
        if (staged) event.preventDefault();
        cancelStaged();
        clearDragging();
        return;
      }
      if (keyboard.selectNext.some((key) => keyMatches(key, keyEvent))) {
        event.preventDefault();
        const all = cards();
        select(all[Math.min(all.length - 1, Math.max(0, all.indexOf(card) + 1))]);
        return;
      }
      if (keyboard.selectPrevious.some((key) => keyMatches(key, keyEvent))) {
        event.preventDefault();
        const all = cards();
        select(all[Math.max(0, all.indexOf(card) - 1)]);
        return;
      }
      const laneDirection = keyboard.selectLeft.some((key) => keyMatches(key, keyEvent))
        ? -1
        : keyboard.selectRight.some((key) => keyMatches(key, keyEvent))
          ? 1
          : 0;
      if (laneDirection) {
        event.preventDefault();
        const allLanes = lanes();
        const lane = card.closest<HTMLElement>(kanbanContract.selectors.lane);
        const laneIndex = lane ? allLanes.indexOf(lane) : -1;
        const targetLane = allLanes[laneIndex + laneDirection];
        const targetCards = targetLane ? cardsIn(targetLane) : [];
        const row = lane ? cardsIn(lane).indexOf(card) : 0;
        select(targetCards[Math.min(targetCards.length - 1, Math.max(0, row))]);
        return;
      }
      const direction = keyboard.moveLeft.some((key) => keyMatches(key, keyEvent))
        ? -1
        : keyboard.moveRight.some((key) => keyMatches(key, keyEvent))
          ? 1
          : 0;
      const rowDirection = keyboard.moveUp.some((key) => keyMatches(key, keyEvent))
        ? -1
        : keyboard.moveDown.some((key) => keyMatches(key, keyEvent))
          ? 1
          : 0;
      if (!direction && !rowDirection) return;
      event.preventDefault();
      const lane = card.closest<HTMLElement>(kanbanContract.selectors.lane);
      const allLanes = lanes();
      const sourceIndex = lane ? allLanes.indexOf(lane) : -1;
      const stagedTarget = staged?.itemId === itemId ? staged.target : null;
      const currentLane = stagedTarget?.lane ?? lane;
      const currentIndex = currentLane ? allLanes.indexOf(currentLane) : sourceIndex;
      const targetLane = allLanes[currentIndex + direction];
      if (!targetLane) return;
      let before = "";
      if (rowDirection) {
        const candidates = cardsIn(targetLane).filter((candidate) => candidate !== card);
        const position = stagedTarget
          ? stagedTarget.before
            ? candidates.findIndex((candidate) => candidate.dataset.kanbanCard === stagedTarget.before)
            : candidates.length
          : cardsIn(targetLane).indexOf(card);
        const nextPosition = Math.max(0, Math.min(candidates.length, position + rowDirection));
        if (nextPosition === position) return;
        before = candidates[nextPosition]?.dataset.kanbanCard ?? "";
      }
      const target: Target = { col: Number(targetLane.dataset.col ?? 0), before, lane: targetLane };
      const releaseKey = keyEvent.altKey
        ? "Alt"
        : keyEvent.metaKey
          ? "Meta"
          : keyEvent.ctrlKey
            ? "Control"
            : keyEvent.shiftKey
              ? "Shift"
              : keyEvent.key;
      staged = { itemId, target, releaseKey };
      markTarget(target);
      host.setAttribute("data-key-staging", "");
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (staged?.releaseKey === event.key) commitStaged();
    };
    const onBlur = () => commitStaged();
    const onPointerDown = (event: PointerEvent) => {
      if (owns(event.target as HTMLElement)) cancelStaged();
    };
    host.addEventListener("keydown", onKeyDown);
    host.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    cleanup(() => {
      cancelStaged();
      focus.dispose();
      pointerDispose();
      flip.dispose();
      host.removeEventListener("keydown", onKeyDown);
      host.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      clearMarks();
      clearDragging();
    });
  },
});
