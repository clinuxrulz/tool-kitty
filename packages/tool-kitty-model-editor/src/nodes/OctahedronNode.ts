import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { octahedronComponentType, OctahedronState } from "../components/OctahedronComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class OctahedronNodeType implements NodeType<NodeTypeExt,NodeExt,OctahedronState> {
  componentType = octahedronComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<OctahedronState>) {
    return new OctahedronNode(nodeParams);
  }
}

export const octahedronNodeType = new OctahedronNodeType();

class OctahedronNode implements Node<NodeTypeExt,NodeExt,OctahedronState> {
  type = octahedronNodeType;
  nodeParams: NodeParams<OctahedronState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<OctahedronState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "size",
        source: () => state.size,
        setSource: (x) => setState("size", x),
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
      let size_ = inputs.get("size");
      if (size_?.type != "Atom") {
        return undefined;
      }
      let size = size_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          p = abs(p);
          float s = ${size};
          float m = p.x+p.y+p.z-s;
          vec3 q;
               if( 3.0*p.x < m ) q = p.xyz;
          else if( 3.0*p.y < m ) q = p.yzx;
          else if( 3.0*p.z < m ) q = p.zxy;
          else return m*0.57735027;
          float k = clamp(0.5*(q.z-q.y+s),0.0,s); 
          return length(vec3(q.x,q.y-s+k,q.z-k));
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
