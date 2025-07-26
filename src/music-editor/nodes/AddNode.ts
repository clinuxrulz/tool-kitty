import { Accessor, createMemo } from "solid-js";
import { addComponentType, AddState } from "../components/AddComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";

export class AddNodeType implements NodeType<AddState> {
  componentType = addComponentType;

  create(nodeParams: NodeParams<AddState>) {
    return new AddNode(nodeParams);
  }
}

export const addNodeType = new AddNodeType();

class AddNode implements Node<AddState> {
  nodeParams: NodeParams<AddState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;

  constructor(nodeParams: NodeParams<AddState>) {
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
