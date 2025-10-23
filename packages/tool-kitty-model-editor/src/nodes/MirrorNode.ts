import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { mirrorComponentType, MirrorState } from "../components/MirrorComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class MirrorNodeType implements NodeType<NodeTypeExt,NodeExt,MirrorState> {
  componentType = mirrorComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<MirrorState>) {
    return new MirrorNode(nodeParams);
  }
}

export const mirrorNodeType = new MirrorNodeType();

class MirrorNode implements Node<NodeTypeExt,NodeExt,MirrorState> {
  type = mirrorNodeType;
  nodeParams: NodeParams<MirrorState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<MirrorState>) {
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
          return ${model.sdfFuncName}(
            vec3(-p.x, p.y, p.z)
          );
        }
      `);
      let colourFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        void ${colourFn}(vec3 p, out vec4 c) {
          ${model.colourFuncName}(
            vec3(-p.x, p.y, p.z),
            c
          );
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
