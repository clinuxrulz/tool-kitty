import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { vec3ComponentType, Vec3State } from "../components/Vec3Component";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";

export class Vec3NodeType implements NodeType<NodeTypeExt,NodeExt,Vec3State> {
  componentType = vec3ComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<Vec3State>) {
    return new Vec3Node(nodeParams);
  }
}

export const vec3NodeType = new Vec3NodeType();

class Vec3Node implements Node<NodeTypeExt,NodeExt,Vec3State> {
  type = vec3NodeType;
  nodeParams: NodeParams<Vec3State>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; isEffectPin?: boolean; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<Vec3State>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.inputPins = createMemo(() => [
      {
        name: "x",
        source: () => state.x,
        setSource: (x) => setState("x", x),
      },
      {
        name: "y",
        source: () => state.y,
        setSource: (x) => setState("y", x),
      },
      {
        name: "z",
        source: () => state.z,
        setSource: (x) => setState("z", x),
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
      let x_ = inputs.get("x");
      let y_ = inputs.get("y");
      let z_ = inputs.get("z");
      let x: string;
      let y: string;
      let z: string;
      if (x_?.type == "Atom") {
        x = x_.value;
      } else {
        x = "0.0";
      }
      if (y_?.type == "Atom") {
        y = y_.value;
      } else {
        y = "0.0";
      }
      if (z_?.type == "Atom") {
        z = z_.value;
      } else {
        z = "0.0";
      }
      return new Map<string,PinValue>([
        [
          "out",
          {
            type: "Atom",
            value: `vec3(${x}, ${y}, ${z})`,
          },
        ]
      ]);
    };
  }
}
