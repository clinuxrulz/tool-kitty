import { Accessor, createMemo } from "solid-js";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";
import { multComponentType, MultState } from "../components/MultComponentType";

export class MultNodeType implements NodeType<MultState> {
  componentType = multComponentType;

  create(nodeParams: NodeParams<MultState>) {
    return new MultNode(nodeParams);
  }
}

export const multNodeType = new MultNodeType();

class MultNode implements Node<MultState> {
  type = multNodeType;
  nodeParams: NodeParams<MultState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;

  constructor(nodeParams: NodeParams<MultState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "a",
        source: () => state.a,
        setSource: (x) => setState("a", x),
      },
      {
        name: "b",
        source: () => state.b,
        setSource: (x) => setState("b", x),
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
