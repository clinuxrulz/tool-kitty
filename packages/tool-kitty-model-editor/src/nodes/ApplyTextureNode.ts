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
      {
        name: "scaleX",
        source: () => state.scaleX,
        setSource: (x) => setState("scaleX", x),
      },
      {
        name: "scaleY",
        source: () => state.scaleY,
        setSource: (x) => setState("scaleY", x),
      },
      {
        name: "offsetX",
        source: () => state.offsetX,
        setSource: (x) => setState("offsetX", x),
      },
      {
        name: "offsetY",
        source: () => state.offsetY,
        setSource: (x) => setState("offsetY", x),
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
      let scaleX_ = inputs.get("scaleX");
      let scaleX: string;
      if (scaleX_?.type == "Atom") {
        scaleX = scaleX_.value;
      } else {
        scaleX = "1.0";
      }
      let scaleY_ = inputs.get("scaleY");
      let scaleY: string;
      if (scaleY_?.type == "Atom") {
        scaleY = scaleY_.value;
      } else {
        scaleY = "1.0";
      }
      let offsetX_ = inputs.get("offsetX");
      let offsetX: string;
      if (offsetX_?.type == "Atom") {
        offsetX = offsetX_.value;
      } else {
        offsetX = "0.0";
      }
      let offsetY_ = inputs.get("offsetY");
      let offsetY: string;
      if (offsetY_?.type == "Atom") {
        offsetY = offsetY_.value;
      } else {
        offsetY = "0.0";
      }
      let colourFuncName = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${colourFuncName}(vec3 p, out vec4 c) {
          c = texture2D(${texture}, (p.xy + vec2(${offsetX}, ${offsetY})) / vec2(${scaleX}, ${scaleY}));
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
