import type { BentoMoveDetail, BentoPosition, BentoResizeDetail } from "../contracts/bento";
import type { TreeMoveDetail } from "../contracts/sortable-tree";
import { showActivity } from "./activity";

type BoardTarget = { cardId: string; col: number; before: string };
type ListTarget = { itemId: string; before: string };
type GroupTarget = { itemId: string; fromList: string; toList: string; before: string };

const kanbanRoot = document.querySelector<HTMLElement>("#kanban-demo");
const sortableRoot = document.querySelector<HTMLElement>("#sortable-demo");
const groupRoot = document.querySelector<HTMLElement>("#group-demo");
const bentoRoot = document.querySelector<HTMLElement>("#bento-demo");
const treeRoot = document.querySelector<HTMLElement>("#tree-demo");
const nestedRoot = document.querySelector<HTMLElement>("#nested-demo");
const customRoot = document.querySelector<HTMLElement>("#custom-demo");
const trashRoot = document.querySelector<HTMLElement>("#trash-demo");
if (!kanbanRoot || !sortableRoot || !groupRoot || !bentoRoot || !treeRoot || !nestedRoot || !customRoot || !trashRoot)
  throw new Error("rocket kit site: missing example root");

const kanbanModel = kanbanRoot.cloneNode(true) as HTMLElement;
const sortableModel = sortableRoot.cloneNode(true) as HTMLElement;
const groupModel = groupRoot.cloneNode(true) as HTMLElement;
const bentoModel = bentoRoot.cloneNode(true) as HTMLElement;
const treeModel = treeRoot.cloneNode(true) as HTMLElement;
const nestedModel = nestedRoot.cloneNode(true) as HTMLElement;
const customModel = customRoot.cloneNode(true) as HTMLElement;
const trashModel = trashRoot.cloneNode(true) as HTMLElement;

function signalPayload(body: string): Record<string, unknown> {
  const payload = JSON.parse(body) as Record<string, unknown>;
  const signals = payload.signals;
  return signals && typeof signals === "object" ? (signals as Record<string, unknown>) : payload;
}

function moveCard(target: BoardTarget, model = kanbanModel): void {
  if (typeof target?.cardId !== "string" || !Number.isInteger(target.col) || typeof target.before !== "string") return;
  const card = model.querySelector<HTMLElement>(`[data-kanban-card="${CSS.escape(target.cardId)}"]`);
  const lane = model.querySelector<HTMLElement>(`[data-kanban-lane][data-col="${target.col}"]`);
  const list = lane?.querySelector<HTMLElement>("[data-kanban-lane-cards]");
  if (!card || !list) return;
  const before = target.before
    ? list.querySelector<HTMLElement>(`[data-kanban-card="${CSS.escape(target.before)}"]`)
    : null;
  if (target.before && !before) return;
  list.insertBefore(card, before);
  for (const lane of model.querySelectorAll<HTMLElement>("[data-kanban-lane]")) {
    const count = lane.querySelector<HTMLElement>(".signal-lane-count");
    if (count) count.textContent = String(lane.querySelectorAll("[data-kanban-card]").length).padStart(2, "0");
  }
}

function moveListItem(target: ListTarget, model = sortableModel): void {
  const item = model.querySelector<HTMLElement>(`[data-sortable-item="${CSS.escape(target.itemId)}"]`);
  const before = target.before
    ? model.querySelector<HTMLElement>(`[data-sortable-item="${CSS.escape(target.before)}"]`)
    : null;
  const list = item?.parentElement;
  if (!item || !list) return;
  list.insertBefore(item, before);
}

function moveGroupItem(target: GroupTarget, model = groupModel): void {
  const source = model.querySelector<HTMLElement>(`[data-drop-list="${CSS.escape(target.fromList)}"]`);
  const list = model.querySelector<HTMLElement>(`[data-drop-list="${CSS.escape(target.toList)}"]`);
  const item = source?.querySelector<HTMLElement>(`[data-drag-item="${CSS.escape(target.itemId)}"]`);
  if (!item || !list) return;
  const before = target.before
    ? list.querySelector<HTMLElement>(`[data-drag-item="${CSS.escape(target.before)}"]`)
    : null;
  list.insertBefore(item, before);
}

function moveTreeNode(target: TreeMoveDetail): void {
  const node = treeModel.querySelector<HTMLElement>(`[data-tree-node="${CSS.escape(target.itemId)}"]`);
  const list = [...treeModel.querySelectorAll<HTMLElement>("[data-tree-children]")].find(
    (candidate) => candidate.dataset.treeParent === target.toParent,
  );
  const from = node?.parentElement;
  if (!node || !list || node.contains(list) || from?.dataset.treeParent !== target.fromParent) return;
  const before = target.before
    ? ([...list.children].find(
        (candidate) => candidate instanceof HTMLElement && candidate.dataset.treeNode === target.before,
      ) ?? null)
    : null;
  if (target.before && !before) return;
  list.insertBefore(node, before);
}

function bentoGrid(id: string): HTMLElement | null {
  return bentoModel.querySelector<HTMLElement>(`[data-bento-grid="${CSS.escape(id)}"]`);
}

function applyBentoPositions(updates: BentoPosition[]): void {
  if (!Array.isArray(updates) || updates.length > 100) return;
  if (updates.some((update) => !update || typeof update.itemId !== "string" || typeof update.grid !== "string")) return;
  const resolved = updates.map((update) => ({
    update,
    grid: bentoGrid(update.grid),
    item: bentoModel.querySelector<HTMLElement>(`[data-bento-item="${CSS.escape(update.itemId)}"]`),
  }));
  if (
    new Set(updates.map((update) => update.itemId)).size !== updates.length ||
    resolved.some(
      ({ update, grid, item }) =>
        !grid ||
        !item ||
        !Number.isInteger(update.col) ||
        !Number.isInteger(update.row) ||
        !Number.isInteger(update.width) ||
        !Number.isInteger(update.height) ||
        update.col < 1 ||
        update.row < 1 ||
        update.row > 100 ||
        update.width < 1 ||
        update.height < 1 ||
        update.height > 5 ||
        update.col + update.width - 1 > Number(grid?.dataset.columns ?? 0),
    )
  )
    return;
  // The preview proposes positions; the fixture still checks the complete resulting layout.
  const proposed = new Map(updates.map((update) => [update.itemId, update]));
  const occupied = new Set<string>();
  for (const item of bentoModel.querySelectorAll<HTMLElement>("[data-bento-item]")) {
    const grid = item.closest<HTMLElement>("[data-bento-grid]");
    const position = proposed.get(item.dataset.bentoItem ?? "");
    const gridId = position?.grid ?? grid?.dataset.bentoGrid;
    if (!gridId) return;
    const col = position?.col ?? Number(item.dataset.bentoCol);
    const row = position?.row ?? Number(item.dataset.bentoRow);
    const width = position?.width ?? Number(item.dataset.bentoWidth);
    const height = position?.height ?? Number(item.dataset.bentoHeight);
    for (let x = col; x < col + width; x++)
      for (let y = row; y < row + height; y++) {
        const key = `${gridId}:${x}:${y}`;
        if (occupied.has(key)) return;
        occupied.add(key);
      }
  }
  for (const { update, grid, item } of resolved) {
    grid!.append(item!);
    item!.dataset.bentoCol = String(update.col);
    item!.dataset.bentoRow = String(update.row);
    item!.dataset.bentoWidth = String(update.width);
    item!.dataset.bentoHeight = String(update.height);
    item!.style.gridColumn = `${update.col} / span ${update.width}`;
    item!.style.gridRow = `${update.row} / span ${update.height}`;
  }
}

function patchResponse(selector: string, model: HTMLElement): Response {
  showActivity("SSE", `patch ${selector}`);
  const lines = ["event: datastar-patch-elements", `data: selector ${selector}`, "data: mode outer"];
  for (const line of model.outerHTML.split("\n")) lines.push(`data: elements ${line}`);
  lines.push("", "");
  return new Response(lines.join("\n"), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/event-stream",
    },
  });
}

const originalFetch = window.fetch.bind(window);
const interceptFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (request.method !== "POST") return originalFetch(input, init);

  if (url.pathname.endsWith("/nested-list-move")) {
    showActivity("Datastar", "@post('./nested-list-move')");
    moveListItem(signalPayload(await request.text()) as unknown as ListTarget, nestedModel);
    return patchResponse("#nested-demo", nestedModel);
  }

  if (url.pathname.endsWith("/nested-group-move")) {
    showActivity("Datastar", "@post('./nested-group-move')");
    moveGroupItem(signalPayload(await request.text()) as unknown as GroupTarget, nestedModel);
    return patchResponse("#nested-demo", nestedModel);
  }

  if (url.pathname.endsWith("/tree-move")) {
    showActivity("Datastar", "@post('./tree-move')");
    moveTreeNode(signalPayload(await request.text()).tree as TreeMoveDetail);
    return patchResponse("#tree-demo", treeModel);
  }

  if (url.pathname.endsWith("/bento-move")) {
    showActivity("Datastar", "@post('./bento-move')");
    applyBentoPositions((signalPayload(await request.text()).bento as BentoMoveDetail).updates);
    return patchResponse("#bento-demo", bentoModel);
  }

  if (url.pathname.endsWith("/bento-resize")) {
    showActivity("Datastar", "@post('./bento-resize')");
    applyBentoPositions((signalPayload(await request.text()).bento as BentoResizeDetail).updates);
    return patchResponse("#bento-demo", bentoModel);
  }

  if (url.pathname.endsWith("/group-move")) {
    showActivity("Datastar", "@post('./group-move')");
    moveGroupItem(signalPayload(await request.text()) as unknown as GroupTarget);
    return patchResponse("#group-demo", groupModel);
  }

  if (url.pathname.endsWith("/list-move")) {
    showActivity("Datastar", "@post('./list-move')");
    moveListItem(signalPayload(await request.text()) as unknown as ListTarget);
    return patchResponse("#sortable-demo", sortableModel);
  }

  if (url.pathname.endsWith("/custom-move")) {
    showActivity("Datastar", "@post('./custom-move')");
    moveCard(signalPayload(await request.text()) as unknown as BoardTarget, customModel);
    return patchResponse("#custom-demo", customModel);
  }

  if (url.pathname.endsWith("/trash-move")) {
    showActivity("Datastar", "@post('./trash-move')");
    const target = signalPayload(await request.text()) as unknown as GroupTarget;
    if (target?.fromList === "tropes" && target.toList === "bin" && typeof target.itemId === "string") {
      const item = trashModel.querySelector<HTMLElement>(
        `[data-drop-list="tropes"] [data-drag-item="${CSS.escape(target.itemId)}"]`,
      );
      if (item) {
        item.remove();
        const count = trashModel.querySelector<HTMLElement>("[data-trope-count]");
        if (count) count.textContent = String(trashModel.querySelectorAll("[data-drag-item]").length).padStart(2, "0");
        document.dispatchEvent(new Event("site:trash-confirmed"));
        const burst = document.querySelector<HTMLElement>(".trash-poof");
        burst?.replaceChildren();
        const spark = document.createElement("span");
        spark.textContent = "✳ POOF!";
        burst?.append(spark);
        spark.addEventListener("animationend", () => spark.remove(), { once: true });
      }
    }
    return patchResponse("#trash-demo", trashModel);
  }

  if (url.pathname.endsWith("/move")) {
    showActivity("Datastar", "@post('./move')");
    moveCard(signalPayload(await request.text()) as unknown as BoardTarget);
    return patchResponse("#kanban-demo", kanbanModel);
  }

  return originalFetch(input, init);
};
window.fetch = interceptFetch as typeof window.fetch;

document.addEventListener("rocket-kanban-select", (event) => {
  const cardId = (event as CustomEvent<{ cardId: string }>).detail.cardId;
  const board = (event.target as Element).closest("rocket-kanban-board");
  board?.querySelectorAll<HTMLElement>("[data-kanban-card]").forEach((card) => {
    card.toggleAttribute("data-selected", card.dataset.kanbanCard === cardId);
  });
});
