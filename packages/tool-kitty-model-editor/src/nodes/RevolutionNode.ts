import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { revolutionComponentType, RevolutionState } from "../components/RevolutionComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class RevolutionNodeType implements NodeType<NodeTypeExt,NodeExt,RevolutionState> {
  componentType = revolutionComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<RevolutionState>) {
    return new RevolutionNode(nodeParams);
  }
}

export const revolutionNodeType = new RevolutionNodeType();

class RevolutionNode implements Node<NodeTypeExt,NodeExt,RevolutionState> {
  type = revolutionNodeType;
  nodeParams: NodeParams<RevolutionState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<RevolutionState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "model",
        source: () => state.model,
        setSource: (x) => setState("model", x),
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
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          vec3 q = vec3( length(p.xz), p.y, 0.0 );
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
              colourFuncName: model.colourFuncName,
            },
          },
        ],
      ]);
    };
  }
}
