import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { roundComponentType, RoundState } from "../components/RoundComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class RoundNodeType implements NodeType<NodeTypeExt,NodeExt,RoundState> {
  componentType = roundComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<RoundState>) {
    return new RoundNode(nodeParams);
  }
}

export const roundNodeType = new RoundNodeType();

class RoundNode implements Node<NodeTypeExt,NodeExt,RoundState> {
  type = roundNodeType;
  nodeParams: NodeParams<RoundState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<RoundState>) {
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
        name: "radius",
        source: () => state.radius,
        setSource: (x) => setState("radius", x),
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
      let radius_ = inputs.get("radius");
      if (radius_?.type != "Atom") {
        return undefined;
      }
      let radius = radius_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          return ${model.sdfFuncName}(p) - ${radius};
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
