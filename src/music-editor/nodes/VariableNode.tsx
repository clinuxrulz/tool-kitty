import { Accessor, Component, createMemo } from "solid-js";
import { Pin } from "../components/Pin";
import { variableComponentType, VariableState } from "../components/VariableComponent";
import { Node, NodeParams, NodeType } from "../Node";

export class VariableNodeType implements NodeType<VariableState> {
  componentType = variableComponentType;

  create(nodeParams: NodeParams<VariableState>) {
    return new VariableNode(nodeParams);
  }
}

export const variableNodeType = new VariableNodeType();

class VariableNode implements Node<VariableState> {
  type = variableNodeType;
  nodeParams: NodeParams<VariableState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;
  ui: Accessor<Component | undefined>;

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
  }
}
