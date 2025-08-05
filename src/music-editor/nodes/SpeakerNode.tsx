import { Accessor, Component, createMemo } from "solid-js";
import { speakerComponentType, SpeakerState } from "../components/SpeakerComponent";
import { Node, NodeParams, NodeType } from "../Node";
import { Pin } from "../components/Pin";

export class SpeakerNodeType implements NodeType<SpeakerState> {
  componentType = speakerComponentType;

  create(nodeParams: NodeParams<SpeakerState>) {
    return new SpeakerNode(nodeParams);
  }
}

export const speakerNodeType = new SpeakerNodeType();

class SpeakerNode implements Node<SpeakerState> {
  type = speakerNodeType;
  nodeParams: NodeParams<SpeakerState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  ui: Accessor<Component | undefined>;

  constructor(nodeParams: NodeParams<SpeakerState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "in",
        source: () => state.in,
        setSource: (x) => setState("in", x),
      },
    ]);
    this.ui = createMemo(() => () =>
      <i
        class="fa-solid fa-volume-high"
        style={{
          "font-size": "24px",
          "color": "green",
        }}
      />
    );
  }
}
