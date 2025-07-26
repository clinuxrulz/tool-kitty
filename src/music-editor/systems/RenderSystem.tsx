import { Accessor, Component, For } from "solid-js";
import { NodesSystemNode } from "./NodesSystem";

export class RenderSystem {
  Render: Component;

  constructor(params: {
    nodes: Accessor<NodesSystemNode[]>,
  }) {

    this.Render = () => (
      <For each={params.nodes()}>
        {(node) => (<RenderNode node={node}/>)}
      </For>
    );
  }
}

const RenderNode: Component<{
  node: NodesSystemNode,
}> = (props) => {
  
  return undefined;
};
