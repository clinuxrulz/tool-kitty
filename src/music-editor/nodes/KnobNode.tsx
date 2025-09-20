import { Accessor, Component, createMemo } from "solid-js";
import { knobComponentType, KnobState } from "../components/KnobComponent";
import { Node, NodeParams, NodeType } from "../Node";
import { Pin } from "../components/Pin";
import Knob from "../Knob";

export class KnobNodeType implements NodeType<KnobState> {
  componentType = knobComponentType;

  create(nodeParams: NodeParams<KnobState>) {
    return new KnobNode(nodeParams);
  }
}

export const knobNodeType = new KnobNodeType();

class KnobNode implements Node<KnobState> {
  type = knobNodeType;
  nodeParams: NodeParams<KnobState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ui: Accessor<Component | undefined>;

  constructor(nodeParams: NodeParams<KnobState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.ui = createMemo(() => () =>
      <Knob size={50} />
    );
  }
}
