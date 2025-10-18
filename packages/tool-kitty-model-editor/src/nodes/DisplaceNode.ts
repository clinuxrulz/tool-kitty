import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { displaceComponentType, DisplaceState } from "../components/DisplaceComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class DisplaceNodeType implements NodeType<NodeTypeExt,NodeExt,DisplaceState> {
  componentType = displaceComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<DisplaceState>) {
    return new DisplaceNode(nodeParams);
  }
}

export const displaceNodeType = new DisplaceNodeType();

class DisplaceNode implements Node<NodeTypeExt,NodeExt,DisplaceState> {
  type = displaceNodeType;
  nodeParams: NodeParams<DisplaceState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<DisplaceState>) {
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
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          float d1 = ${model1.sdfFuncName}(p);
          float d2 = ${model2.sdfFuncName}(p);
          return d1 + d2;
        }
      `);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${colourFn}(vec3 p, out vec4 c) {
          float d1 = ${model1.sdfFuncName}(p);
          float d2 = ${model2.sdfFuncName}(p);
          float t = d1 + d2;
          vec4 c1;
          vec4 c2;
          ${model1.colourFuncName}(p, c1);
          ${model2.colourFuncName}(p, c2);
          c = (c1 * d2 + c2 * d1) / t;
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
