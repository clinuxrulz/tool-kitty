import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { extrusionComponentType, ExtrusionState } from "../components/ExtrusionComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class ExtrusionNodeType implements NodeType<NodeTypeExt,NodeExt,ExtrusionState> {
  componentType = extrusionComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ExtrusionState>) {
    return new ExtrusionNode(nodeParams);
  }
}

export const extrusionNodeType = new ExtrusionNodeType();

class ExtrusionNode implements Node<NodeTypeExt,NodeExt,ExtrusionState> {
  type = extrusionNodeType;
  nodeParams: NodeParams<ExtrusionState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ExtrusionState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "model2D",
        source: () => state.model2D,
        setSource: (x) => setState("model2D", x),
      },
      {
        name: "height",
        source: () => state.height,
        setSource: (x) => setState("height", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.ext.generateCode = ({ ctx, inputs, }) => {
      let model2D_ = inputs.get("model2D");
      if (model2D_?.type != "Model") {
        return undefined;
      }
      let model2D = model2D_.value;
      let height_ = inputs.get("height");
      if (height_?.type != "Atom") {
        return undefined;
      }
      let height = height_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          float d = ${model2D.sdfFuncName}(p);
          vec2 w = vec2( d, abs(p.z) - ${height} );
          return min(max(w.x,w.y),0.0) + length(max(w,0.0));
        }
      `);
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Model",
            value: {
              sdfFuncName: sdfFn,
              colourFuncName: "defaultColour",
            },
          },
        ],
      ]);
    };
  }
}
