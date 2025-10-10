import { Accessor, Component, createMemo } from "solid-js";
import { speakerComponentType, SpeakerState } from "../components/SpeakerComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class SpeakerNodeType implements NodeType<NodeTypeExt,NodeExt,SpeakerState> {
  componentType = speakerComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<SpeakerState>) {
    return new SpeakerNode(nodeParams);
  }
}

export const speakerNodeType = new SpeakerNodeType();

class SpeakerNode implements Node<NodeTypeExt,NodeExt,SpeakerState> {
  type = speakerNodeType;
  nodeParams: NodeParams<SpeakerState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt;

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
    this.ext = {
      generateCode: ({ ctx, inputAtoms, }) => {
        let in_ = inputAtoms.get("in");
        if (in_ == undefined) {
          return [];
        }
        ctx.insertCode([
          `result += ${in_}`,
        ]);
        return [{
          outputAtoms: new Map<string,string>(),
        }];
      }
    };
  }
}
