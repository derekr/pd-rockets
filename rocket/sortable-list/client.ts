// @ts-ignore — the browser bundle resolves the vendored Rocket module at this URL.
import { rocket } from "/js/datastar-rocket.js";
import { installFlip } from "../../core/flip";
import { insertionBefore } from "../../core/insertion-target";
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
    const dispose = installPointerDrag({
      host,
      itemSelector: sortableListContract.selectors.item,
      itemId,
      targetAt,
      mark,
      beforeCommit: flip.prepare,
      commit: (itemId, target) => {
        host.dispatchEvent(
          new CustomEvent<SortableMoveDetail>(sortableListContract.events.move, {
            bubbles: true,
            composed: true,
            detail: { itemId, before: target.before },
          }),
        );
      },
    });
    cleanup(() => {
      dispose();
      flip.dispose();
    });
  },
});
