import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { translateComponentType, TranslateState } from "../components/TranslateComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class TranslateNodeType implements NodeType<NodeTypeExt,NodeExt,TranslateState> {
  componentType = translateComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<TranslateState>) {
    return new TranslateNode(nodeParams);
  }
}

export const translateNodeType = new TranslateNodeType();

class TranslateNode implements Node<NodeTypeExt,NodeExt,TranslateState> {
  type = translateNodeType;
  nodeParams: NodeParams<TranslateState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<TranslateState>) {
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
        name: "offset",
        source: () => state.offset,
        setSource: (x) => setState("offset", x),
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
      let offset_ = inputs.get("offset");
      if (offset_?.type != "Atom") {
        return undefined;
      }
      let offset = offset_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          return ${model.sdfFuncName}(p - ${offset});
        }
      `);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${colourFn}(vec3 p, out vec4 c) {
          ${model.colourFuncName}(p - ${offset}, c);
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
