import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { sphereComponentType, SphereState } from "../components/SphereComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";

export class SphereNodeType implements NodeType<NodeTypeExt,NodeExt,SphereState> {
  componentType = sphereComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<SphereState>) {
      return new SphereNode(nodeParams);
  }
}

export const sphereNodeType = new SphereNodeType();

class SphereNode implements Node<NodeTypeExt,NodeExt,SphereState> {
  type = sphereNodeType;
  nodeParams: NodeParams<SphereState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<SphereState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "radius",
        source: () => state.radius,
        setSource: (x) => setState("radius", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
  }
}
