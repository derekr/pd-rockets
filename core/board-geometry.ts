/** Lane-grid geometry for boards with variable-height card tracks. Rows are zero-based. */
export type BoardLane = { col: number; ids: string[] };
export type BoardLaneGeometry = {
  rect: { left: number; right: number; top: number };
  tracks: { rows: number[]; gap: number };
};

/** Computed grid-template-rows resolves each track to pixels. */
export function parseGridTemplate(template: string): number[] {
  return template
    .split(" ")
    .map((part) => parseFloat(part))
    .filter((value) => Number.isFinite(value) && value > 0);
}

/** Resolve the row at a lane-local offset; positions past the last track append. */
export function gridIndex(offset: number, rows: readonly number[], gap: number): number {
  let cursor = 0;
  for (let row = 0; row < rows.length; row++) {
    const size = rows[row]!;
    if (offset < cursor + size + gap / 2) return row;
    cursor += size + gap;
  }
  return rows.length;
}

/** Lane-local center of a row, extrapolating a pitch past the last track. */
export function rowCenter(rows: readonly number[], gap: number, row: number): number {
  const pitch = (rows[0] ?? 0) + gap;
  let top = 0;
  for (let index = 0; index < Math.min(row, rows.length); index++) top += rows[index]! + gap;
  const size = rows[Math.min(row, rows.length - 1)] ?? pitch;
  return top + size / 2;
}

/** Nearest horizontal lane and its grid row, including empty lanes and gutters. */
export function cellFromPoint(
  lanes: readonly BoardLaneGeometry[],
  x: number,
  y: number,
): { lane: number; row: number } | null {
  if (!lanes.length) return null;
  let nearest = 0;
  let distance = Infinity;
  for (let index = 0; index < lanes.length; index++) {
    const rect = lanes[index]!.rect;
    const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0;
    if (dx < distance) {
      distance = dx;
      nearest = index;
    }
  }
  const target = lanes[nearest]!;
  return { lane: nearest, row: gridIndex(y - target.rect.top, target.tracks.rows, target.tracks.gap) };
}

/** Remove a card before inserting it, matching a server-side list splice. */
export function insertOrder(lanes: readonly BoardLane[], movingId: string, col: number, row: number): BoardLane[] {
  const order = lanes.map((lane) => ({ col: lane.col, ids: lane.ids.filter((id) => id !== movingId) }));
  let target = order.find((lane) => lane.col === col);
  if (!target) {
    target = { col, ids: [] };
    order.push(target);
  }
  target.ids.splice(Math.max(0, Math.min(row, target.ids.length)), 0, movingId);
  return order;
}

/** CSS quoted-string escape; ids are opaque values, never CSS source. */
function cssString(value: string): string {
  return value.replace(/[\x00-\x1f\x7f"\\]/g, (character) => `\\${character.codePointAt(0)!.toString(16)} `);
}

/** Placement overrides for lane grids. Scope is a trusted host selector, never user content. */
export function placementRules(lanes: readonly BoardLane[], excludeId?: string, scope = ""): string {
  let css = "";
  for (const lane of lanes) {
    lane.ids.forEach((id, index) => {
      if (id !== excludeId)
        css += `${scope ? `${scope} ` : ""}[data-board-card="${cssString(id)}"]{grid-row:${index + 1}}`;
    });
  }
  return css;
}
