import { bentoContract } from "../../../contracts/bento";
import { datastarEventBinding, type DatastarEventBinding } from "./event-binding";

export type BentoTile = { id: string; label: string; col: number; row: number; width: number; height: number };
export type BentoGrid = { id: string; label: string; columns: number; items: readonly BentoTile[] };

export function BentoWorkspace({
  grids,
  move,
  resize,
}: {
  grids: readonly BentoGrid[];
  move?: DatastarEventBinding;
  resize?: DatastarEventBinding;
}) {
  return (
    <rocket-bento-workspace
      {...datastarEventBinding(bentoContract.events.move, move)}
      {...datastarEventBinding(bentoContract.events.resize, resize)}
    >
      {grids.map((grid) => (
        <section aria-label={grid.label}>
          <h3>{grid.label}</h3>
          <div data-bento-grid={grid.id} data-columns={grid.columns} style={`--bento-columns: ${grid.columns}`}>
            {grid.items.map((item) => (
              <article
                data-bento-item={item.id}
                data-bento-col={item.col}
                data-bento-row={item.row}
                data-bento-width={item.width}
                data-bento-height={item.height}
                tabindex={0}
                style={`grid-column: ${item.col} / span ${item.width}; grid-row: ${item.row} / span ${item.height}`}
              >
                <strong>{item.label}</strong>
                <button type="button" data-bento-resize="" aria-label={`Resize ${item.label}`}>
                  ↘
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </rocket-bento-workspace>
  );
}
