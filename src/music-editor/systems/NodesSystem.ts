import { Accessor, createMemo } from "solid-js";
import { Node } from "../Node";
import { Transform2D } from "../../math/Transform2D";
import { IEcsWorld } from "../../ecs/IEcsWorld";

export type NodesSystemNode = {
  node: Node<any>,
  space: Accessor<Transform2D>,
  setSpace: (x: Transform2D) => void,
}

export class NodesSystem {
  nodes: Accessor<NodesSystemNode[]>;

  constructor(params: {
    world: IEcsWorld,
  }) {
    this.nodes = createMemo(() => []);
  }
}
