import { Accessor, Component, createMemo } from "solid-js";
import { meowComponentType, MeowState } from "../components/MeowComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";

export class MeowNodeType implements NodeType<MeowState> {
  componentType = meowComponentType;

  create(nodeParams: NodeParams<MeowState>) {
    return new MeowNode(nodeParams);
  }
}

export const meowNodeType = new MeowNodeType();

class MeowNode implements Node<MeowState> {
  type = meowNodeType;
  nodeParams: NodeParams<MeowState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  ui: Accessor<Component>;

  constructor(nodeParams: NodeParams<MeowState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "frequency",
        source: () => state.frequency,
        setSource: (x) => setState("frequency", x),
      }
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
    this.ui = createMemo(() => () => (
      <img
        width="120px"
        height="120px"
        src="./cat-node.jpg"
      />
    ));
  }
}
