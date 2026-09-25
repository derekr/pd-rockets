// @ts-ignore — the browser bundle resolves the vendored Rocket module at this URL.
import { rocket } from "/js/datastar-rocket.js";
import { sortableTreeContract, type TreeMoveDetail } from "../../contracts/sortable-tree";
import { installFlip } from "../../core/flip";
import { keyMatches } from "../../core/keyboard";
import { installPointerDrag } from "../../core/pointer-drag";

type Target = { list: HTMLElement; parentId: string; before: string; into: boolean };

rocket(sortableTreeContract.tag, {
  mode: "light",
  setup({ host, cleanup }: { host: HTMLElement; cleanup: (fn: () => void) => void }) {
    const { node: nodeSelector, row: rowSelector, children: childrenSelector } = sortableTreeContract.selectors;
    const owns = (element: HTMLElement) => element.closest(sortableTreeContract.tag) === host;
    const nodeFor = (row: HTMLElement) => row.closest<HTMLElement>(nodeSelector);
    const rowId = (row: HTMLElement) => (owns(row) ? (nodeFor(row)?.dataset.treeNode ?? null) : null);
    const lists = () => [...host.querySelectorAll<HTMLElement>(childrenSelector)].filter(owns);
    const childrenOf = (list: HTMLElement) =>
      [...list.children].filter(
        (child): child is HTMLElement => child instanceof HTMLElement && child.matches(nodeSelector),
      );
    const nodeById = (id: string) =>
      [...host.querySelectorAll<HTMLElement>(nodeSelector)].find((node) => owns(node) && node.dataset.treeNode === id);
    const rowOf = (node: HTMLElement) => node.querySelector<HTMLElement>(`:scope > ${rowSelector}`);
    const listFor = (node: HTMLElement) => node.parentElement?.closest<HTMLElement>(childrenSelector);
    const flip = installFlip({ host, itemSelector: rowSelector, itemId: rowId });

    const valid = (sourceId: string, target: Target): boolean => {
      const source = nodeById(sourceId);
      if (!source || source.contains(target.list)) return false;
      const parent = target.parentId && nodeById(target.parentId);
      if (parent && parent.dataset.treeKind !== "folder") return false;
      return target.before !== sourceId;
    };
    const targetAt = (x: number, y: number, id: string): Target | null => {
      const hit = document.elementFromPoint(x, y);
      const row = hit?.closest<HTMLElement>(rowSelector);
      const node = row && nodeFor(row);
      if (row && node && owns(row)) {
        const list = listFor(node);
        if (!list) return null;
        const ratio = (y - row.getBoundingClientRect().top) / row.getBoundingClientRect().height;
        if (node.dataset.treeKind === "folder" && ratio >= 0.3 && ratio <= 0.7) {
          const nested = node.querySelector<HTMLElement>(`:scope > ${childrenSelector}`);
          const target = nested && { list: nested, parentId: node.dataset.treeNode ?? "", before: "", into: true };
          return target && valid(id, target) ? target : null;
        }
        const before =
          ratio < 0.5 ? (node.dataset.treeNode ?? "") : (node.nextElementSibling?.getAttribute("data-tree-node") ?? "");
        const target = { list, parentId: list.dataset.treeParent ?? "", before, into: false };
        return valid(id, target) ? target : null;
      }
      const list = hit?.closest<HTMLElement>(childrenSelector);
      if (!list || !owns(list)) return null;
      const target = { list, parentId: list.dataset.treeParent ?? "", before: "", into: !!list.dataset.treeParent };
      return valid(id, target) ? target : null;
    };
    const mark = (target: Target | null) => {
      lists().forEach((list) => {
        list.removeAttribute("data-tree-end");
        list.querySelectorAll<HTMLElement>(rowSelector).forEach((row) => {
          row.removeAttribute("data-tree-before");
          row.removeAttribute("data-tree-into");
        });
      });
      if (!target) return;
      if (target.into) {
        const parent = nodeById(target.parentId);
        const row = parent && rowOf(parent);
        row?.setAttribute("data-tree-into", "");
      } else if (target.before) {
        const node = childrenOf(target.list).find((candidate) => candidate.dataset.treeNode === target.before);
        if (node) rowOf(node)?.setAttribute("data-tree-before", "");
      } else target.list.setAttribute("data-tree-end", "");
    };
    const emitMove = (id: string, target: Target) => {
      const node = nodeById(id);
      const source = node && listFor(node);
      if (!node || !source || !valid(id, target)) return;
      const fromParent = source.dataset.treeParent ?? "";
      if (source === target.list && (node.nextElementSibling?.getAttribute("data-tree-node") ?? "") === target.before)
        return;
      host.dispatchEvent(
        new CustomEvent<TreeMoveDetail>(sortableTreeContract.events.move, {
          bubbles: true,
          composed: true,
          detail: { itemId: id, fromParent, toParent: target.parentId, before: target.before },
        }),
      );
    };

    let staged: { id: string; target: Target } | null = null;
    let focusTarget: { id: string; target: Target } | null = null;
    let focusInterval: ReturnType<typeof setInterval> | null = null;
    let focusTimeout: ReturnType<typeof setTimeout> | null = null;
    const restoreFocus = () => {
      if (!focusTarget) return;
      const { id, target } = focusTarget;
      const node = nodeById(id);
      if (!node || listFor(node) !== target.list) {
        // A morph can replace the list node; compare its semantic parent instead.
        if (!node || listFor(node)?.dataset.treeParent !== target.parentId) return;
      }
      if ((node.nextElementSibling?.getAttribute("data-tree-node") ?? "") !== target.before) return;
      rowOf(node)?.focus({ preventScroll: true });
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
      const { id, target } = staged;
      clearStage();
      focusTarget = { id, target };
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
      const row = (event.target as HTMLElement).closest<HTMLElement>(rowSelector);
      const id = row && rowId(row);
      if (!id) return;
      if (event.key === "Escape") {
        if (staged) event.preventDefault();
        clearStage();
        return;
      }
      if (!event.altKey && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        const rows = [...host.querySelectorAll<HTMLElement>(rowSelector)].filter(owns);
        const index = rows.indexOf(row!);
        const node = nodeById(id);
        const childList = node?.querySelector<HTMLElement>(`:scope > ${childrenSelector}`);
        const firstChild = childList && childrenOf(childList)[0];
        const parent = node?.parentElement?.closest<HTMLElement>(nodeSelector);
        const next =
          event.key === "ArrowUp"
            ? rows[index - 1]
            : event.key === "ArrowDown"
              ? rows[index + 1]
              : event.key === "Home"
                ? rows[0]
                : event.key === "End"
                  ? rows.at(-1)
                  : event.key === "ArrowRight" && firstChild
                    ? rowOf(firstChild)
                    : event.key === "ArrowLeft" && parent
                      ? rowOf(parent)
                      : null;
        if (next) {
          event.preventDefault();
          next.focus();
        }
        return;
      }
      const dx =
        keyMatches("Alt+ArrowLeft", event) || keyMatches("Alt+h", event)
          ? -1
          : keyMatches("Alt+ArrowRight", event) || keyMatches("Alt+l", event)
            ? 1
            : 0;
      const dy =
        keyMatches("Alt+ArrowUp", event) || keyMatches("Alt+k", event)
          ? -1
          : keyMatches("Alt+ArrowDown", event) || keyMatches("Alt+j", event)
            ? 1
            : 0;
      if (!dx && !dy) return;
      event.preventDefault();
      const node = nodeById(id);
      const list = staged?.id === id ? staged.target.list : node && listFor(node);
      if (!node || !list) return;
      const siblings = childrenOf(list).filter((candidate) => candidate !== node);
      const currentBefore =
        staged?.id === id ? staged.target.before : (node.nextElementSibling?.getAttribute("data-tree-node") ?? "");
      const position = currentBefore
        ? siblings.findIndex((candidate) => candidate.dataset.treeNode === currentBefore)
        : siblings.length;
      let target: Target | null = null;
      if (dy) {
        const next = Math.max(0, Math.min(siblings.length, position + dy));
        if (next !== position)
          target = {
            list,
            parentId: list.dataset.treeParent ?? "",
            before: siblings[next]?.dataset.treeNode ?? "",
            into: false,
          };
      } else if (dx > 0) {
        const previous = siblings
          .slice(0, position)
          .reverse()
          .find((candidate) => candidate.dataset.treeKind === "folder");
        const nested = previous?.querySelector<HTMLElement>(`:scope > ${childrenSelector}`);
        if (nested) target = { list: nested, parentId: previous?.dataset.treeNode ?? "", before: "", into: true };
      } else {
        const parent = list.closest<HTMLElement>(nodeSelector);
        const outer = parent && listFor(parent);
        if (parent && outer)
          target = {
            list: outer,
            parentId: outer.dataset.treeParent ?? "",
            before: parent.nextElementSibling?.getAttribute("data-tree-node") ?? "",
            into: false,
          };
      }
      if (!target || !valid(id, target)) return;
      staged = { id, target };
      host.setAttribute("data-key-staging", "");
      mark(target);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Alt") commitStage();
    };
    const onPointerDown = () => clearStage();
    const dispose = installPointerDrag({
      host,
      itemSelector: rowSelector,
      itemId: rowId,
      targetAt,
      mark,
      beforeCommit: (id, rect) => flip.prepare({ itemId: id, rect }),
      commit: emitMove,
    });
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
