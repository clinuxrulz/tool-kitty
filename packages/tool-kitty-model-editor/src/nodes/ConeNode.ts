import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { coneComponentType, ConeState } from "../components/ConeComponent";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { glsl } from "@bigmistqke/view.gl/tag";

export class ConeNodeType implements NodeType<NodeTypeExt,NodeExt,ConeState> {
  componentType = coneComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<ConeState>) {
    return new ConeNode(nodeParams);
  }
}

export const coneNodeType = new ConeNodeType();

class ConeNode implements Node<NodeTypeExt,NodeExt,ConeState> {
  type = coneNodeType;
  nodeParams: NodeParams<ConeState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<ConeState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "radius",
        source: () => state.radius,
        setSource: (x) => setState("radius", x),
      },
      {
        name: "height",
        source: () => state.height,
        setSource: (x) => setState("height", x),
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
      let radius_ = inputs.get("radius");
      if (radius_?.type != "Atom") {
        return undefined;
      }
      let radius = radius_.value;
      let height_ = inputs.get("height");
      if (height_?.type != "Atom") {
        return undefined;
      }
      let height = height_.value;
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p) {
          float h = ${height};
          float z = sqrt(${height} * ${height} + ${radius} * ${radius});
          vec2 c = vec2(${radius} / z, ${height} / z);
          vec2 q = h*vec2(c.x/c.y,-1.0);
          vec2 w = vec2( length(p.xz), p.y );
          vec2 a = w - q*clamp( dot(w,q)/dot(q,q), 0.0, 1.0 );
          vec2 b = w - q*vec2( clamp( w.x/q.x, 0.0, 1.0 ), 1.0 );
          float k = sign( q.y );
          float d = min(dot( a, a ),dot(b, b));
          float s = max( k*(w.x*q.y-w.y*q.x),k*(w.y-q.y)  );
          return sqrt(d)*sign(s);        }
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
