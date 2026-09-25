export type Cell = { col: number; row: number; width: number; height: number };
export type PlacedItem = Cell & { id: string };

export function overlaps(a: Cell, b: Cell): boolean {
  return a.col < b.col + b.width && b.col < a.col + a.width && a.row < b.row + b.height && b.row < a.row + a.height;
}

/** Anchor the changed item, then shift displaced items down to the next free row. */
export function placeWithPush(items: readonly PlacedItem[], moved: PlacedItem, columns: number): PlacedItem[] {
  const width = Math.min(Math.max(1, moved.width), columns);
  const result: PlacedItem[] = [
    {
      ...moved,
      col: Math.min(Math.max(1, moved.col), columns - width + 1),
      row: Math.max(1, moved.row),
      width,
      height: Math.max(1, moved.height),
    },
  ];
  for (const item of items.filter((item) => item.id !== moved.id).sort((a, b) => a.row - b.row || a.col - b.col)) {
    const placed = { ...item, width: Math.min(Math.max(1, item.width), columns), row: Math.max(1, item.row) };
    placed.col = Math.min(Math.max(1, placed.col), columns - placed.width + 1);
    while (result.some((existing) => overlaps(placed, existing))) placed.row++;
    result.push(placed);
  }
  return result;
}
