import { Accessor, createMemo } from "solid-js";
import { releaseComponentType, ReleaseState } from "../components/ReleaseComponentType";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class ReleaseNodeType implements NodeType<NodeTypeExt,NodeExt,ReleaseState> {
  componentType = releaseComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ReleaseState>) {
    return new ReleaseNode(nodeParams);
  }  
}

export const releaseNodeType = new ReleaseNodeType();

class ReleaseNode implements Node<NodeTypeExt,NodeExt,ReleaseState> {
  type = releaseNodeType;
  nodeParams: NodeParams<ReleaseState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ReleaseState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "timeToZero",
        source: () => state.timeToZero,
        setSource: (x) => setState("timeToZero", x),
      }
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
  }
}
