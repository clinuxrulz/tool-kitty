import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { sinXYZFieldComponentType, SinXYZFieldState } from "../components/SinXYZFieldComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class SinXYZFieldNodeType implements NodeType<NodeTypeExt,NodeExt,SinXYZFieldState> {
  componentType = sinXYZFieldComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<SinXYZFieldState>) {
    return new SinXYZFieldNode(nodeParams);
  }
}

export const sinXYZFieldNodeType = new SinXYZFieldNodeType();

class SinXYZFieldNode implements Node<NodeTypeExt,NodeExt,SinXYZFieldState> {
  type = sinXYZFieldNodeType;
  nodeParams: NodeParams<SinXYZFieldState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<SinXYZFieldState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "frequency",
        source: () => state.frequency,
        setSource: (x) => setState("frequency", x),
      },
      {
        name: "magnitude",
        source: () => state.magnitude,
        setSource: (x) => setState("magnitude", x),
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
      let frequency_ = inputs.get("frequency");
      if (frequency_?.type != "Atom") {
        return undefined;
      }
      let frequency = frequency_.value;
      let magnitude_ = inputs.get("magnitude");
      if (magnitude_?.type != "Atom") {
        return undefined;
      }
      let magnitude = magnitude_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          return ${magnitude} * sin(p.x*${frequency}) * sin(p.y*${frequency}) * sin(p.z*${frequency});
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
