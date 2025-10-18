import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { applyColourComponentType, ApplyColourState } from "../components/ApplyColourComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, batch, Component, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class ApplyColourNodeType implements NodeType<NodeTypeExt,NodeExt,ApplyColourState> {
  componentType = applyColourComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ApplyColourState>) {
    return new ApplyColourNode(nodeParams);
  }
}

export const applyColourNodeType = new ApplyColourNodeType();

class ApplyColourNode implements Node<NodeTypeExt,NodeExt,ApplyColourState> {
  type = applyColourNodeType;
  nodeParams: NodeParams<ApplyColourState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ApplyColourState>) {
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
        name: "colour",
        source: () => state.colour,
        setSource: (x) => setState("colour", x),
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
      let colour_ = inputs.get("colour");
      if (colour_?.type != "Atom") {
        return undefined;
      }
      let colour = colour_.value;
      let applyColourFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${applyColourFn}(vec3 p, out vec4 c) {
          c = vec4(${colour});
        }
      `);
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Model",
            value: {
              sdfFuncName: model.sdfFuncName,
              colourFuncName: applyColourFn,
            },
          },
        ],
      ]);
    };
  }
}
