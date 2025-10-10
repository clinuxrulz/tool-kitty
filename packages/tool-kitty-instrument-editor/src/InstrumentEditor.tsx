import { batch, Component, ComponentProps, createComputed, createMemo, createSignal, mapArray, on, onCleanup, onMount, Show, splitProps, untrack } from "solid-js";
import { Overwrite } from "tool-kitty-util";
import { Complex, Transform2D, Vec2 } from "tool-kitty-math";
import { EcsWorld } from "tool-kitty-ecs";
import { transform2DComponentType } from "tool-kitty-math-ecs";
import { createStore } from "solid-js/store";
import { sineWaveComponentType } from "./components/SineWaveComponent";
import { generateCode } from "./code-gen";
import { importMidi } from "./import_midi";
import { NodeEditorUI, NodesSystem } from "tool-kitty-node-editor";
import { nodeRegistry } from "./nodes/node_registry";
import { NodeExt, NodeTypeExt } from "./NodeExt";

const InstrumentEditor: Component<
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
    makeSound: boolean,
  }>({
    showCode: false,
    makeSound: false,
  });
  let [ nodesSystem, setNodesSystem, ] = createSignal<NodesSystem<NodeTypeExt,NodeExt>>();
  // test
  setTimeout(() => {
    let world = props.world;
    if (world.entities().length != 0) {
      return;
    }
    world.createEntity([
      sineWaveComponentType.create({
        frequency: undefined,
        amplitude: undefined,
        centre: undefined,
        out: [],
      }),
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(50, 50),
          Complex.rot0,
        ),
      }),
    ]);
  });
  let code = createMemo(() => {
    let nodesSystem2 = nodesSystem();
    if (nodesSystem2 == undefined) {
      return undefined;
    }
    if (!(state.showCode || state.makeSound)) {
      return undefined;
    }
    return generateCode({
      nodesSystem: nodesSystem2,
    });
  });
  createComputed(on(
    [
      () => state.makeSound,
      code,
    ],
    ([makeSound, code]) => {
      let nodesSystem2 = nodesSystem();
      if (nodesSystem2 == undefined) {
        return;
      }
      if (!makeSound) {
        return;
      }
      if (code == undefined) {
        return;
      }
      let url = URL.createObjectURL(new Blob([code], { type: "text/javascript", }));
      let audioCtx = new AudioContext();
      (async () => {
        await audioCtx.audioWorklet.addModule(url);
        let audioWorkletNode = new AudioWorkletNode(audioCtx, "compiled-graph-audio-worklet-processor");
        let visitedNodeTypeSet = new Set<string>();
        for (let node of nodesSystem2.nodes()) {
          let nodeType = node.node.type;
          if (visitedNodeTypeSet.has(nodeType.componentType.typeName)) {
            continue;
          }
          visitedNodeTypeSet.add(nodeType.componentType.typeName);
          await nodeType.ext.initAudioCtx?.(audioCtx, audioWorkletNode);
        }
        for (let node of nodesSystem2.nodes()) {
          await node.node.ext.init?.(audioWorkletNode);
        }
        audioWorkletNode.connect(audioCtx.destination);
      })();
      onCleanup(() => {
        (async () => {
          await audioCtx.close();
          URL.revokeObjectURL(url);
        })();
      });
    },
  ));
  //
  let [ importMidiInput, setImportMidiInput ] = createSignal<HTMLInputElement>();
  //
  return (
    <div
      {...rest}
    >
      <div
        style={{
          "width": "100%",
          "height": "100%",
          "display": "flex",
          "flex-direction": "column",
          "position": "relative",
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
          toolbar={
            <>
              <button
                class="btn btn-primary"
                onClick={() => {
                  let x = importMidiInput();
                  if (x == undefined) {
                    return;
                  }
                  x.click();
                }}
              >
                Import Midi
                <input
                  ref={setImportMidiInput}
                  type="file"
                  hidden
                  onInput={(e) => {
                    let files = e.currentTarget.files;
                    if (files == null || files.length != 1) {
                      return;
                    }
                    let file = files[0];
                    importMidi(props.world, file);
                    e.currentTarget.value = "";
                  }}
                />
              </button>
              <label class="label" style="margin-left: 5px;">
                <input
                  type="checkbox"
                  class="checkbox"
                  checked={state.showCode}
                  onChange={(e) => setState("showCode", e.currentTarget.checked)}
                />
                Show Code
              </label>
              <label class="label" style="margin-left: 5px;">
                <input
                  type="checkbox"
                  class="checkbox"
                  checked={state.makeSound}
                  onChange={(e) => setState("makeSound", e.currentTarget.checked)}
                />
                Make Sound
              </label>
            </>
          }
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

export default InstrumentEditor;
