import { insertOrder, placementRules, type BoardLane } from "./board-geometry";

/** A disposable board placement supplied by a consuming page's interaction lifecycle. */
export type BoardProjectionMove = {
  cardId: string;
  fromCol: number;
  col: number;
  row: number;
};

/** Plan a CSS override without reading signals, mutating DOM or storing server truth. */
export function projectBoardMoves(lanes: readonly BoardLane[], moves: readonly BoardProjectionMove[], scope = "") {
  let order = lanes.map((lane) => ({ col: lane.col, ids: [...lane.ids] }));
  const touched = new Set<number>();
  for (const move of moves) {
    order = insertOrder(order, move.cardId, move.col, move.row);
    touched.add(move.col);
    touched.add(move.fromCol);
  }
  return {
    order,
    touchedColumns: touched,
    movedIds: new Set(moves.map((move) => move.cardId)),
    css: placementRules(
      order.filter((lane) => touched.has(lane.col)),
      undefined,
      scope,
    ),
  };
}
