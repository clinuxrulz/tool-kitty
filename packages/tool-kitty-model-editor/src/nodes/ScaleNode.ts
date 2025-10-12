import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { scaleComponentType, ScaleState } from "../components/ScaleComponent";

export class ScaleNodeType implements NodeType<NodeTypeExt,NodeExt,ScaleState> {
  componentType = scaleComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ScaleState>) {
    return new ScaleNode(nodeParams);
  }
}

export const scaleNodeType = new ScaleNodeType();

class ScaleNode implements Node<NodeTypeExt,NodeExt,ScaleState> {
  type = scaleNodeType;
  nodeParams: NodeParams<ScaleState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ScaleState>) {
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
        name: "scale",
        source: () => state.scale,
        setSource: (x) => setState("scale", x),
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
      let scale_ = inputs.get("scale");
      if (scale_?.type != "Atom") {
        return undefined;
      }
      let scale = scale_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `float ${sdfFn}(vec3 p) {`,
        `  return ${model.sdfFuncName}(p / ${scale}) * ${scale};`,
        "}",
      ]);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `void ${colourFn}(vec3 p, out vec4 c) {`,
        `  ${model.colourFuncName}(p / ${scale}, c);`,
        "}",
      ]);
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
