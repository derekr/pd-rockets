import { sortableTreeContract } from "../../../contracts/sortable-tree";
import { datastarEventBinding, type DatastarEventBinding } from "./event-binding";

export type FileNode = {
  id: string;
  name: string;
  kind: "folder" | "file";
  children?: readonly FileNode[];
};

function Node({ node }: { node: FileNode }) {
  return (
    <div data-tree-node={node.id} data-tree-kind={node.kind}>
      <div data-tree-row="" tabindex={0} aria-label={`${node.kind}: ${node.name}`}>
        <span aria-hidden="true">{node.kind === "folder" ? "▾" : "·"}</span> {node.name}
      </div>
      {node.kind === "folder" && (
        <div data-tree-children="" data-tree-parent={node.id}>
          {node.children?.map((child) => (
            <Node node={child} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SortableTree({ nodes, move }: { nodes: readonly FileNode[]; move?: DatastarEventBinding }) {
  return (
    <rocket-sortable-tree {...datastarEventBinding(sortableTreeContract.events.move, move)}>
      <div data-tree-children="" data-tree-parent="" aria-label="Files">
        {nodes.map((node) => (
          <Node node={node} />
        ))}
      </div>
    </rocket-sortable-tree>
  );
}
