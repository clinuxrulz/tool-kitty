import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { differenceComponentType, DifferenceState } from "../components/DifferenceComponent";

export class DifferenceNodeType implements NodeType<NodeTypeExt,NodeExt,DifferenceState> {
  componentType = differenceComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<DifferenceState>) {
    return new DifferenceNode(nodeParams);
  }
}

export const differenceNodeType = new DifferenceNodeType();

class DifferenceNode implements Node<NodeTypeExt,NodeExt,DifferenceState> {
  type = differenceNodeType;
  nodeParams: NodeParams<DifferenceState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<DifferenceState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "model1",
        source: () => state.model1,
        setSource: (x) => setState("model1", x),
      },
      {
        name: "model2",
        source: () => state.model2,
        setSource: (x) => setState("model2", x),
      },
      {
        name: "k",
        source: () => state.k,
        setSource: (x) => setState("k", x),
      }
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.ext.generateCode = ({ ctx, inputs, }) => {
      let model1_ = inputs.get("model1");
      if (model1_?.type != "Model") {
        return undefined;
      }
      let model1 = model1_.value;
      let model2_ = inputs.get("model2");
      if (model2_?.type != "Model") {
        return undefined;
      }
      let model2 = model2_.value;
      let k_ = inputs.get("k");
      if (k_ != undefined && k_.type != "Atom") {
        return undefined;
      }
      let sdfFn = ctx.allocVar();
      if (k_?.type == "Atom") {
        let k = k_.value;
        ctx.insertGlobalCode([
          `float ${sdfFn}(vec3 p) {`,
          `  float k = ${k} * 4.0;`,
          `  float d1 = -${model1.sdfFuncName}(p);`,
          `  float d2 = ${model2.sdfFuncName}(p);`,
          `  float h = max(k-abs(d1-d2),0.0);`,
          "  return -(min(d1, d2) - h*h*0.25/k);",
          "}",
        ]);
      } else {
        ctx.insertGlobalCode([
          `float ${sdfFn}(vec3 p) {`,
          `  return -min(-${model1.sdfFuncName}(p), ${model2.sdfFuncName}(p));`,
          "}",
        ]);
      }
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `void ${colourFn}(vec3 p, out vec4 c) {`,
        `  c = vec4(0.7, 0.7, 0.7, 1.0);`,
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
