import { Accessor, Component, createMemo, createSignal } from "solid-js";
import { pianoKeysComponentType, PianoKeysState } from "../components/PianoKeysComponent";
import { Node, NodeParams, NodeType, Pin, NodesSystemNode } from "tool-kitty-node-editor";
import PianoKeys from "../PianoKeys";
import { cloneSubGraph, CodeGenNode } from "../code-gen";
import { noteNodeType } from "./NoteNode";
import { v4 as uuid } from "uuid";
import { createStore } from "solid-js/store";
import { NoteState } from "../components/NoteComponent";
import { Transform2D } from "tool-kitty-math";
import { NodeExt, NodeTypeExt } from "../NodeExt";

export class PianoKeysNodeType implements NodeType<NodeTypeExt,NodeExt,PianoKeysState> {
  componentType = pianoKeysComponentType;
  ext: NodeTypeExt;

  constructor() {
    this.ext = {
      generateInitOnceCode: ({ ctx }) => {
        ctx.insertGlobalCode([
          "let noteDown = {};",
        ]);
        ctx.insertMessageHandlerCode(
          "NoteOn",
          [
            "noteDown[params.id] = true;",
          ],
        );
        ctx.insertMessageHandlerCode(
          "NoteOff",
          [
            "noteDown[params.id] = false;",
          ],
        );
      }
    };
  }

  create(nodeParams: NodeParams<PianoKeysState>) {
    return new PianoKeysNode(nodeParams);
  }
}

export const pianoKeysNodeType = new PianoKeysNodeType();

class PianoKeysNode implements Node<NodeTypeExt,NodeExt,PianoKeysState> {
  type = pianoKeysNodeType;
  nodeParams: NodeParams<PianoKeysState>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void, }[]>;
  ui: Accessor<Component | undefined>;
  ext: NodeExt;
  
  constructor(nodeParams: NodeParams<PianoKeysState>) {
    let state = nodeParams.state;
    let setState = nodeParams.setState;
    this.nodeParams = nodeParams;
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
    let [ audioWorkletNode, setAudioWorkletNode, ] = createSignal<AudioWorkletNode>();
    this.ui = createMemo(() => () =>
      <PianoKeys
        onNoteOn={(name) => {
          let n = audioWorkletNode();
          if (n == undefined) {
            return;
          }
          n.port.postMessage({
            type: "NoteOn",
            params: {
              id: `${nodeParams.entity}/${name}`,
            },
          });
        }}
        onNoteOff={(name) => {
          let n = audioWorkletNode();
          if (n == undefined) {
            return;
          }
          n.port.postMessage({
            type: "NoteOff",
            params: {
              id: `${nodeParams.entity}/${name}`,
            },
          });
        }}
      />
    );
    const NOTES = [
      "C",
      "C#",
      "D",
      "D#",
      "E",
      "F",
      "F#",
      "G",
      "G#",
      "A",
      "A#",
      "B",
    ];
    this.ext = {
    macro: (node, recordNewNode) => {
      let targets: { node: CodeGenNode, pin: string, }[] = [];
      let outs = [...node.outputs["out"]];
      for (let t of outs) {
        targets.push(t);
        for (let i = 0; i < NOTES.length-1; ++i) {
          let node2 = cloneSubGraph(t.node, recordNewNode);
          targets.push({ node: node2, pin: t.pin, });
        }
      }
      let noteIdx = 0;
      for (let { node: node2, pin, } of targets) {
        let [ noteState, noteSetState ] = createStore<NoteState>({
          entity: nodeParams.entity,
          note: NOTES[noteIdx],
          out: [],
        });
        let noteNode = noteNodeType.create({
          entity: uuid(),
          state: noteState,
          setState: noteSetState,
        });
        let noteNode2: NodesSystemNode<NodeTypeExt,NodeExt> = {
          node: noteNode,
          space: () => Transform2D.identity,
          setSpace: () => {},
          setRenderSizeAccessor: () => {},
          setInputPinPositionMapAccessor: () => {},
          setOutputPinPositionMapAccessor: () => {},
          renderSize: () => undefined,
          inputPinPositionMap: () => undefined,
          outputPinPositionMap: () => undefined,
        };
        let noteNode3: CodeGenNode = {
          id: 0,
          inputs: {},
          outputs: {
            "out": [{
              node: node2,
              pin,
            }]
          },
          height: 0,
          node: noteNode2,
        };
        recordNewNode(noteNode3);
        node2.inputs[pin] = {
          node: noteNode3,
          pin: "out",
        };
        ++noteIdx;
        if (noteIdx >= NOTES.length) {
          noteIdx = 0;
        }
      }
      node.outputs["out"] = [];
    },
    generateCode: ({ ctx, }) => {
      {
        let decl = [];
        for (let note of NOTES) {
          decl.push(`noteDown["${nodeParams.entity}/${note}"] = false;`);
        }
        ctx.insertGlobalCode(decl);
      }
      return [
        {
          outputAtoms: new Map<string,string>(),
        }
      ];
    },
    init: async (workletNode) => {
      setAudioWorkletNode(workletNode);
    },
    };
  }
}
