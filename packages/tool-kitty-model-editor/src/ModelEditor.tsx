import { Component, ComponentProps, createMemo, createSignal, Show, splitProps } from "solid-js";
import { EcsWorld } from "tool-kitty-ecs";
import { NodeEditorUI, NodesSystem } from "tool-kitty-node-editor";
import { Overwrite } from "tool-kitty-util";
import { NodeExt, NodeTypeExt } from "./NodeExt";
import { nodeRegistry } from "./nodes/node_registery";
import { createStore } from "solid-js/store";
import { generateCode } from "./code-gen";

const ModelEditor: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      world: EcsWorld,
    }
  >
> = (props_) => {
  let [ props, rest, ] = splitProps(props_, [
    "world",
  ]);
  let [ state, setState, ] = createStore<{
    showCode: boolean,
  }>({
    showCode: false,
  });
  let [ nodesSystem, setNodesSystem, ] = createSignal<NodesSystem<NodeTypeExt,NodeExt>>();
  let code = createMemo(() => {
    let nodesSystem2 = nodesSystem();
    if (nodesSystem2 == undefined) {
      return undefined;
    }
    return generateCode({
      nodesSystem: nodesSystem2,
    });
  });
  return (
    <div
      {...rest}
    >
      <div
        style={{
          "width": "100%",
          "height": "100%",
          "position": "relative",
          "display": "flex",
        }}
      >
        <NodeEditorUI
          style={{
            "flex-grow": "1",
          }}
          onInit={(controller) => {
            setNodesSystem(controller.nodesSystem);
          }}
          nodeRegistry={nodeRegistry}
          world={props.world}
          toolbar={<>
            <label class="label" style="margin-left: 5px;">
              <input
                type="checkbox"
                class="checkbox"
                checked={state.showCode}
                onChange={(e) => setState("showCode", e.currentTarget.checked)}
              />
              Show Code
            </label>
          </>}
        />
        <Show when={state.showCode ? code() : undefined}>
          {(code) =>
            <div
              style={{
                "position": "absolute",
                "right": "0",
                "top": "0",
                "bottom": "0",
                "overflow": "auto",
                "width": "50%",
              }}
            >
              <pre innerText={code()}/>
            </div>
          }
        </Show>
      </div>
    </div>
  );
};

export default ModelEditor;
