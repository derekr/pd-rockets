type KanbanMoveDetail = { cardId: string; col: number; before: string };
type SortableMoveDetail = { itemId: string; before: string };

function kanbanCard(id: string): HTMLElement | null {
  return document.querySelector<HTMLElement>(`[data-kanban-card="${CSS.escape(id)}"]`);
}

document.addEventListener("rocket-kanban-move", (event) => {
  const { cardId, col, before } = (event as CustomEvent<KanbanMoveDetail>).detail;
  const card = kanbanCard(cardId);
  const lane = document.querySelector<HTMLElement>(`[data-kanban-lane][data-col="${col}"]`);
  const target = before ? lane?.querySelector<HTMLElement>(`[data-kanban-card="${CSS.escape(before)}"]`) : null;
  const list = lane?.querySelector<HTMLElement>("[data-kanban-lane-cards]");
  if (card && list) list.insertBefore(card, target ?? null);
});

document.addEventListener("rocket-kanban-select", (event) => {
  const { cardId } = (event as CustomEvent<{ cardId: string }>).detail;
  document.querySelectorAll<HTMLElement>("[data-kanban-card]").forEach((card) => {
    card.toggleAttribute("data-selected", card.dataset.kanbanCard === cardId);
  });
});

document.addEventListener("rocket-sortable-move", (event) => {
  const { itemId, before } = (event as CustomEvent<SortableMoveDetail>).detail;
  const item = document.querySelector<HTMLElement>(`[data-sortable-item="${CSS.escape(itemId)}"]`);
  const target = document.querySelector<HTMLElement>(`[data-sortable-item="${CSS.escape(before)}"]`);
  const list = item?.parentElement;
  if (item && list) list.insertBefore(item, target ?? null);
});
