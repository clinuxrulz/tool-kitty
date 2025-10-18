import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { bendComponentType, BendState } from "../components/BendComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class BendNodeType implements NodeType<NodeTypeExt,NodeExt,BendState> {
  componentType = bendComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<BendState>) {
    return new BendNode(nodeParams);
  }
}

export const bendNodeType = new BendNodeType();

class BendNode implements Node<NodeTypeExt,NodeExt,BendState> {
  type = bendNodeType;
  nodeParams: NodeParams<BendState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<BendState>) {
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
        name: "k",
        source: () => state.k,
        setSource: (x) => setState("k", x),
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
      let k_ = inputs.get("k");
      if (k_?.type != "Atom") {
        return undefined;
      }
      let k = k_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          float k = ${k};
          float c = cos(k*p.x);
          float s = sin(k*p.x);
          mat2  m = mat2(c,-s,s,c);
          vec3  q = vec3(m*p.xy,p.z);
          return ${model.sdfFuncName}(q);
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
