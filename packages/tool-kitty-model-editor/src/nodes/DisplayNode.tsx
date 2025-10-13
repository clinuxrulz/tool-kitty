import { Accessor, Component, createMemo } from "solid-js";
import { displayComponentType, DisplayState } from "../components/DisplayComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { PinValue } from "../CodeGenCtx";

export class DisplayNodeType implements NodeType<NodeTypeExt,NodeExt,DisplayState> {
  componentType = displayComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<DisplayState>) {
    return new DisplayNode(nodeParams);
  }
}

export const displayNodeType = new DisplayNodeType();

class DisplayNode implements Node<NodeTypeExt,NodeExt,DisplayState> {
  type = displayNodeType;
  nodeParams: NodeParams<DisplayState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<DisplayState>) {
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
        class="fa-solid fa-desktop"
        style={{
          "font-size": "24px",
          "color": "green",
        }}
      />
    );
    this.ext.generateCode = ({ ctx, inputs }) => {
      let in_ = inputs.get("in");
      if (in_?.type != "Model") {
        return undefined;
      }
      let in2 = in_.value;
      let { sdfFuncName, colourFuncName, } = in2;
      ctx.insertCode([
        `d = min(d, ${sdfFuncName}(p));`
      ]);
      let d = ctx.allocVar();
      ctx.insertColourCode([
        `float ${d} = ${sdfFuncName}(p);`,
        `if (${d} < d) {`,
        `  d = ${d};`,
        `  ${colourFuncName}(p, c);`,
        "}",
      ]);
      return new Map<string,PinValue>();
    };
  }
}
