import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { applyTextureComponentType, ApplyTextureState } from "../components/ApplyTextureComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class ApplyTextureNodeType implements NodeType<NodeTypeExt,NodeExt,ApplyTextureState> {
  componentType = applyTextureComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ApplyTextureState>) {
    return new ApplyTextureNode(nodeParams);
  }
}

export const applyTextureNodeType = new ApplyTextureNodeType();

class ApplyTextureNode implements Node<NodeTypeExt,NodeExt,ApplyTextureState> {
  type = applyTextureNodeType;
  nodeParams: NodeParams<ApplyTextureState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ApplyTextureState>) {
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
        name: "texture",
        source: () => state.texture,
        setSource: (x) => setState("texture", x),
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
      let texture_ = inputs.get("texture");
      if (texture_?.type != "Atom") {
        return undefined;
      }
      let texture = texture_.value;
      let colourFuncName = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${colourFuncName}(vec3 p, out vec4 c) {
          c = texture2D(${texture}, p.xy);
        }
      `);
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Model",
            value: {
              sdfFuncName: model.sdfFuncName,
              colourFuncName: colourFuncName,
            },
          },
        ],
      ]);
    };
  }
}
