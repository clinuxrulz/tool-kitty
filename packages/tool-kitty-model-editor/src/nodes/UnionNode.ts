import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { unionComponentType, UnionState } from "../components/UnionComponent";

export class UnionNodeType implements NodeType<NodeTypeExt,NodeExt,UnionState> {
  componentType = unionComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<UnionState>) {
    return new UnionNode(nodeParams);
  }
}

export const unionNodeType = new UnionNodeType();

class UnionNode implements Node<NodeTypeExt,NodeExt,UnionState> {
  type = unionNodeType;
  nodeParams: NodeParams<UnionState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<UnionState>) {
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
          `  float d1 = ${model1.sdfFuncName}(p);`,
          `  float d2 = ${model2.sdfFuncName}(p);`,
          `  float h = max(k-abs(d1-d2),0.0);`,
          "  return min(d1, d2) - h*h*0.25/k;",
          "}",
        ]);
      } else {
        ctx.insertGlobalCode([
          `float ${sdfFn}(vec3 p) {`,
          `  return min(${model1.sdfFuncName}(p), ${model2.sdfFuncName}(p));`,
          "}",
        ]);
      }
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode([
        `void ${colourFn}(vec3 p, out vec4 c) {`,
        `  float d1 = ${model1.sdfFuncName}(p);`,
        `  float d2 = ${model2.sdfFuncName}(p);`,
        `  float t = d1 + d2;`,
        `  vec4 c1;`,
        `  vec4 c2;`,
        `  ${model1.colourFuncName}(p, c1);`,
        `  ${model2.colourFuncName}(p, c2);`,
        `  c = (c1 * d2 + c2 * d1) / t;`,
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
