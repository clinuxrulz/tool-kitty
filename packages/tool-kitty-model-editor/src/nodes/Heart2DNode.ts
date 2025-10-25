import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { Accessor, createMemo } from "solid-js";
import { PinValue } from "../CodeGenCtx";
import { heart2DComponentType, Heart2DState } from "../components/Heart2DComponent";
import { glsl } from "@bigmistqke/view.gl/tag";

export class Heart2DNodeType implements NodeType<NodeTypeExt,NodeExt,Heart2DState> {
  componentType = heart2DComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<Heart2DState>) {
    return new Heart2DNode(nodeParams);
  }
}

export const heart2DNodeType = new Heart2DNodeType();

class Heart2DNode implements Node<NodeTypeExt,NodeExt,Heart2DState> {
  type = heart2DNodeType;
  nodeParams: NodeParams<Heart2DState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; isEffectPin?: boolean; }[]>;
  ext: NodeExt = {};

  constructor(nodeParams: NodeParams<Heart2DState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      },
    ]);
    this.ext.generateCode = ({ ctx, inputs, }) => {
      let sdfFn = ctx.allocVar();
      ctx.insertGlobalCode(glsl`
        float ${sdfFn}(vec3 p2) {
          vec2 p = p2.xy;
          p.x = abs(p.x);
          if( p.y+p.x>1.0 )
            return sqrt(dot2(p-vec2(0.25,0.75))) - sqrt(2.0)/4.0;
          return sqrt(min(dot2(p-vec2(0.00,1.00)),
                          dot2(p-0.5*max(p.x+p.y,0.0)))) * sign(p.x-p.y);
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
