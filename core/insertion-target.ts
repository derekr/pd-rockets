/** Resolve a one-dimensional insert point; an empty `before` appends. */
export function insertionBefore(items: readonly { id: string; top: number; bottom: number }[], y: number): string {
  for (const item of items) {
    if (y < (item.top + item.bottom) / 2) return item.id;
  }
  return "";
}
