import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { boundingBoxComponentType, BoundingBoxState } from "../components/BoundingBoxComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class BoundingBoxNodeType implements NodeType<NodeTypeExt,NodeExt,BoundingBoxState> {
  componentType = boundingBoxComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<BoundingBoxState>) {
    return new BoundingBoxNode(nodeParams);
  }
}

export const boundingBoxNodeType = new BoundingBoxNodeType();

class BoundingBoxNode implements Node<NodeTypeExt,NodeExt,BoundingBoxState> {
  type = boundingBoxNodeType;
  nodeParams: NodeParams<BoundingBoxState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<BoundingBoxState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "model",
        source: () => state.model,
        setSource: (x) => setState("model", x),
      },
      {
        name: "size",
        source: () => state.size,
        setSource: (x) => setState("size", x),
      },
      {
        name: "padding",
        source: () => state.padding,
        setSource: (x) => setState("padding", x),
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
      let model_ = inputs.get("model");
      if (model_?.type != "Model") {
        return undefined;
      }
      let model = model_.value;
      let size_ = inputs.get("size");
      if (size_?.type != "Atom") {
        return undefined;
      }
      let size = size_.value;
      let padding_ = inputs.get("padding");
      if (padding_?.type != "Atom") {
        return undefined;
      }
      let padding = padding_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          vec3 q = abs(p) - 0.5 * (${size}+${padding});
          float d = length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) + ${padding};
          if (d >= ${padding}) {
            return d;
          } else {
            return ${model.sdfFuncName}(p);
          }
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
