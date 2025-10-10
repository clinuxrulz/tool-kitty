import { Accessor, Component, createMemo } from "solid-js";
import { variableComponentType, VariableState } from "../components/VariableComponent";
import { Node, NodeParams, NodeType, Pin } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class VariableNodeType implements NodeType<NodeTypeExt,NodeExt,VariableState> {
  componentType = variableComponentType;
  ext: NodeTypeExt = {};

  create(nodeParams: NodeParams<VariableState>) {
    return new VariableNode(nodeParams);
  }
}

export const variableNodeType = new VariableNodeType();

class VariableNode implements Node<NodeTypeExt,NodeExt,VariableState> {
  type = variableNodeType;
  nodeParams: NodeParams<VariableState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt;

  constructor(nodeParams: NodeParams<VariableState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "value",
        sinks: () => state.value,
        setSinks: (x) => setState("value", x),
      },
    ]);
    this.ui = createMemo(() => () => {
      return (
        <label>
          <span style="color: black; padding-right: 5px;">Id:</span>
          <input
            class="input"
            type="text"
            size={8}
            value={state.id}
            onInput={(e) => {
              setState("id", e.currentTarget.value);
            }}
          />
        </label>
      );
    });
    this.ext = {
      generateCode: ({ ctx, inputAtoms }) => {
        ctx.insertConstructorCode([
          `this.variables["${state.id}"] = 0.0;`
        ]);
        let value = `this.variables["${state.id}"]`;
        let outputAtoms = new Map<string,string>();
        outputAtoms.set("value", value);
        return [{ outputAtoms, }];
      }
    };
  }
}
