import { Accessor, createMemo, EcsComponentType } from "../../lib";
import { delayComponentType, DelayState } from "../components/DelayComponent";
import { Pin } from "../components/Pin";
import { Node, NodeParams, NodeType } from "../Node";

export class DelayNodeType implements NodeType<DelayState> {
  componentType = delayComponentType;

  create(nodeParams: NodeParams<DelayState>) {
      return new DelayNode(nodeParams);
  }
}

export const delayNodeType = new DelayNodeType();

class DelayNode implements Node<DelayState> {
  type = delayNodeType;
  nodeParams: NodeParams<DelayState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;

  constructor(nodeParams: NodeParams<DelayState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "Prev",
        source: () => state.prev,
        setSource: (x) => setState("prev", x),
      },
      {
        name: "Delay",
        source: () => state.delay,
        setSource: (x) => setState("delay", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "next",
        sinks: () => state.next,
        setSinks: (x) => setState("next", x),
      },
    ]);
  }
}
