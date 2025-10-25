import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, Component, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { scaleXComponentType, ScaleXState } from "../components/ScaleXComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class ScaleXNodeType implements NodeType<NodeTypeExt,NodeExt,ScaleXState> {
  componentType = scaleXComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ScaleXState>) {
    return new ScaleXNode(nodeParams);
  }
}

export const scaleXNodeType = new ScaleXNodeType();

class ScaleXNode implements Node<NodeTypeExt,NodeExt,ScaleXState> {
  type = scaleXNodeType;
  nodeParams: NodeParams<ScaleXState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};
  ui: Accessor<Component | undefined> | undefined;

  constructor(nodeParams: NodeParams<ScaleXState>) {
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
        name: "scaleX",
        source: () => state.scaleX,
        setSource: (x) => setState("scaleX", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.ui = createMemo(() => () => (
      <i style="color: yellow; background-color: black;" class="fa-solid fa-triangle-exclamation"></i>
    ));
    this.ext.generateCode = ({ ctx, inputs, }) => {
      let model_ = inputs.get("model");
      if (model_?.type != "Model") {
        return undefined;
      }
      let model = model_.value;
      let scaleX_ = inputs.get("scaleX");
      if (scaleX_?.type != "Atom") {
        return undefined;
      }
      let scaleX = scaleX_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          return ${model.sdfFuncName}(vec3(p.x / ${scaleX}, p.y, p.z));
        }
      `);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${colourFn}(vec3 p, out vec4 c) {
          ${model.colourFuncName}(vec3(p.x / ${scaleX}, p.y, p.z), c);
        }
      `);
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Model",
            value: {
              sdfFuncName: sdfFn,
              colourFuncName: colourFn,
            },
          },
        ],
      ]);
    };
  }
}
