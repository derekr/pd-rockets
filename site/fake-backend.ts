import { placeWithPush, type PlacedItem } from "../rocket/bento/placement";

type BoardTarget = { cardId: string; col: number; before: string };
type ListTarget = { itemId: string; before: string };
type GroupTarget = { itemId: string; fromList: string; toList: string; before: string };
type BentoMove = {
  itemId: string;
  fromGrid: string;
  toGrid: string;
  col: number;
  row: number;
  width: number;
  height: number;
};
type BentoResize = { itemId: string; grid: string; width: number; height: number };

const kanbanRoot = document.querySelector<HTMLElement>("#kanban-demo");
const sortableRoot = document.querySelector<HTMLElement>("#sortable-demo");
const groupRoot = document.querySelector<HTMLElement>("#group-demo");
const bentoRoot = document.querySelector<HTMLElement>("#bento-demo");
if (!kanbanRoot || !sortableRoot || !groupRoot || !bentoRoot) throw new Error("rocket kit site: missing example root");

const kanbanModel = kanbanRoot.cloneNode(true) as HTMLElement;
const sortableModel = sortableRoot.cloneNode(true) as HTMLElement;
const groupModel = groupRoot.cloneNode(true) as HTMLElement;
const bentoModel = bentoRoot.cloneNode(true) as HTMLElement;

function signalPayload(body: string): Record<string, unknown> {
  const payload = JSON.parse(body) as Record<string, unknown>;
  const signals = payload.signals;
  return signals && typeof signals === "object" ? (signals as Record<string, unknown>) : payload;
}

function moveCard(target: BoardTarget): void {
  const card = kanbanModel.querySelector<HTMLElement>(`[data-kanban-card="${CSS.escape(target.cardId)}"]`);
  const lane = kanbanModel.querySelector<HTMLElement>(`[data-kanban-lane][data-col="${target.col}"]`);
  const list = lane?.querySelector<HTMLElement>("[data-kanban-lane-cards]");
  if (!card || !list) return;
  card.remove();
  const before = target.before
    ? list.querySelector<HTMLElement>(`[data-kanban-card="${CSS.escape(target.before)}"]`)
    : null;
  list.insertBefore(card, before);
}

function moveListItem(target: ListTarget): void {
  const item = sortableModel.querySelector<HTMLElement>(`[data-sortable-item="${CSS.escape(target.itemId)}"]`);
  const before = target.before
    ? sortableModel.querySelector<HTMLElement>(`[data-sortable-item="${CSS.escape(target.before)}"]`)
    : null;
  const list = item?.parentElement;
  if (!item || !list) return;
  list.insertBefore(item, before);
}

function moveGroupItem(target: GroupTarget): void {
  const source = groupModel.querySelector<HTMLElement>(`[data-drop-list="${CSS.escape(target.fromList)}"]`);
  const list = groupModel.querySelector<HTMLElement>(`[data-drop-list="${CSS.escape(target.toList)}"]`);
  const item = source?.querySelector<HTMLElement>(`[data-drag-item="${CSS.escape(target.itemId)}"]`);
  if (!item || !list) return;
  const before = target.before
    ? list.querySelector<HTMLElement>(`[data-drag-item="${CSS.escape(target.before)}"]`)
    : null;
  list.insertBefore(item, before);
}

function bentoGrid(id: string): HTMLElement | null {
  return bentoModel.querySelector<HTMLElement>(`[data-bento-grid="${CSS.escape(id)}"]`);
}

function bentoItems(grid: HTMLElement): PlacedItem[] {
  return [...grid.querySelectorAll<HTMLElement>("[data-bento-item]")].map((item) => ({
    id: item.dataset.bentoItem ?? "",
    col: Number(item.dataset.bentoCol),
    row: Number(item.dataset.bentoRow),
    width: Number(item.dataset.bentoWidth),
    height: Number(item.dataset.bentoHeight),
  }));
}

function layoutBento(grid: HTMLElement, item: PlacedItem): void {
  for (const placed of placeWithPush(bentoItems(grid), item, Number(grid.dataset.columns ?? 4))) {
    const element = grid.querySelector<HTMLElement>(`[data-bento-item="${CSS.escape(placed.id)}"]`);
    if (!element) continue;
    element.dataset.bentoCol = String(placed.col);
    element.dataset.bentoRow = String(placed.row);
    element.dataset.bentoWidth = String(placed.width);
    element.dataset.bentoHeight = String(placed.height);
    element.style.gridColumn = `${placed.col} / span ${placed.width}`;
    element.style.gridRow = `${placed.row} / span ${placed.height}`;
  }
}

function moveBento(target: BentoMove): void {
  const source = bentoGrid(target.fromGrid);
  const destination = bentoGrid(target.toGrid);
  const tile = source?.querySelector<HTMLElement>(`[data-bento-item="${CSS.escape(target.itemId)}"]`);
  if (!tile || !destination) return;
  destination.append(tile);
  layoutBento(destination, {
    id: target.itemId,
    col: target.col,
    row: target.row,
    width: target.width,
    height: target.height,
  });
}

function resizeBento(target: BentoResize): void {
  const grid = bentoGrid(target.grid);
  const tile = grid?.querySelector<HTMLElement>(`[data-bento-item="${CSS.escape(target.itemId)}"]`);
  if (!grid || !tile) return;
  layoutBento(grid, {
    id: target.itemId,
    col: Number(tile.dataset.bentoCol),
    row: Number(tile.dataset.bentoRow),
    width: target.width,
    height: target.height,
  });
}

function patchResponse(selector: string, model: HTMLElement): Response {
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

  if (url.pathname.endsWith("/bento-move")) {
    moveBento(signalPayload(await request.text()).bento as BentoMove);
    return patchResponse("#bento-demo", bentoModel);
  }

  if (url.pathname.endsWith("/bento-resize")) {
    resizeBento(signalPayload(await request.text()).bento as BentoResize);
    return patchResponse("#bento-demo", bentoModel);
  }

  if (url.pathname.endsWith("/group-move")) {
    moveGroupItem(signalPayload(await request.text()) as unknown as GroupTarget);
    return patchResponse("#group-demo", groupModel);
  }

  if (url.pathname.endsWith("/list-move")) {
    moveListItem(signalPayload(await request.text()) as unknown as ListTarget);
    return patchResponse("#sortable-demo", sortableModel);
  }

  if (url.pathname.endsWith("/move")) {
    moveCard(signalPayload(await request.text()) as unknown as BoardTarget);
    return patchResponse("#kanban-demo", kanbanModel);
  }

  return originalFetch(input, init);
};
window.fetch = interceptFetch as typeof window.fetch;

document.addEventListener("rocket-kanban-select", (event) => {
  const cardId = (event as CustomEvent<{ cardId: string }>).detail.cardId;
  document.querySelectorAll<HTMLElement>("[data-kanban-card]").forEach((card) => {
    card.toggleAttribute("data-selected", card.dataset.kanbanCard === cardId);
  });
});
