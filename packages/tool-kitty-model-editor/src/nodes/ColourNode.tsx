import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { colourComponentType, ColourState } from "../components/ColourComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, batch, Component, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { Colour, ColourPicker } from "tool-kitty-components";

export class ColourNodeType implements NodeType<NodeTypeExt,NodeExt,ColourState> {
  componentType = colourComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ColourState>) {
    return new ColourNode(nodeParams);
  }
}

export const colourNodeType = new ColourNodeType();

class ColourNode implements Node<NodeTypeExt,NodeExt,ColourState> {
  type = colourNodeType;
  nodeParams: NodeParams<ColourState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ColourState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => []);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.ui = createMemo(() => () =>
      <div style="width: 300px; height: 300px; display: flex; flex-direction: column;">
        <ColourPicker
          colour={
            new Colour(
              state.colour.red,
              state.colour.green,
              state.colour.blue,
              state.colour.alpha,
            )
          }
          onColour={(colour) => {
            setState("colour", {
              red: colour.r,
              green: colour.g,
              blue: colour.b,
              alpha: colour.a,
            });
          }}
        />
      </div>
    );
    this.ext.generateCode = ({ ctx, inputs, }) => {
      let colour = `vec4(${state.colour.red / 255.0}, ${state.colour.green / 255.0}, ${state.colour.blue / 255.0}, ${state.colour.alpha / 255.0})`;
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Atom",
            value: colour,
          },
        ],
      ]);
    };
  }
}
