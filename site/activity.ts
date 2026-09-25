/** Guide-only, bounded activity toasts. Never include event detail or request payloads. */
const activity = document.querySelector<HTMLElement>("#demo-activity");
const queue = activity?.querySelector<HTMLElement>("[data-activity-queue]");

export function showActivity(kind: "Rocket" | "Datastar" | "SSE", label: string): void {
  if (!queue) return;
  const toast = document.createElement("li");
  toast.className = "activity-toast";
  toast.dataset.kind = kind;
  const category = document.createElement("b");
  category.textContent = kind;
  const message = document.createElement("span");
  message.textContent = label;
  toast.append(category, message);
  queue.append(toast);
  while (queue.children.length > 5) queue.firstElementChild?.remove();
  setTimeout(() => toast.remove(), 5500);
}

for (const name of [
  "rocket-kanban-move",
  "rocket-kanban-select",
  "rocket-sortable-move",
  "rocket-drag-group-move",
  "rocket-bento-move",
  "rocket-bento-resize",
  "rocket-tree-move",
]) {
  document.addEventListener(name, () => showActivity("Rocket", name), { capture: true });
}
