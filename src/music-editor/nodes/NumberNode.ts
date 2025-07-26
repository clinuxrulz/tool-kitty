import { Accessor, createMemo } from "../../lib";
import { numberComponentType, NumberState } from "../components/NumberComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";

export class NumberNodeType implements NodeType<NumberState> {
  componentType = numberComponentType;

  create(nodeParams: NodeParams<NumberState>): Node<NumberState> {
    return new NoiseNode(nodeParams);
  }  
}

export const numberNodeType = new NumberNodeType();

class NoiseNode implements Node<NumberState> {
  type = numberNodeType;
  nodeParams: NodeParams<NumberState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;

  constructor(nodeParams: NodeParams<NumberState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
  }
}
