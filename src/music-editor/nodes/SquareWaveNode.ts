import { Accessor, createMemo } from "../../lib";
import { Pin } from "../components/Pin";
import { squareWaveComponentType, SquareWaveState } from "../components/SquareWaveComponent";
import { Node, NodeParams, NodeType } from "../Node";
import squareWaveAudioWorkletProcessorUrl from  "./worklets/sine-wave-audio-worklet-processor.ts?worker&url";

export class SquareWaveNodeType implements NodeType<SquareWaveState> {
  componentType = squareWaveComponentType;
  registerAudioWorkletModules = (audioCtx: AudioContext) => {
    audioCtx.audioWorklet.addModule(squareWaveAudioWorkletProcessorUrl);
  };

  create(nodeParams: NodeParams<SquareWaveState>) {
    return new SquareWaveNode(nodeParams);
  }
}

export const squareWaveNodeType = new SquareWaveNodeType();

class SquareWaveNode implements Node<SquareWaveState> {
  type = squareWaveNodeType;
  nodeParams: NodeParams<SquareWaveState>;
  inputPins: Accessor<{ name: string; source: Accessor<Pin | undefined>; setSource: (x: Pin | undefined) => void; }[]>;
  outputPins: Accessor<{ name: string; sinks: Accessor<Pin[]>; setSinks: (x: Pin[]) => void; }[]>;

  constructor(nodeParams: NodeParams<SquareWaveState>) {
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
        name: "amplitude",
        source: () => state.amplitude,
        setSource: (x) => setState("amplitude", x),
      },
      {
        name: "centre",
        source: () => state.centre,
        setSource: (x) => setState("centre", x),
      },
    ]);
    this.outputPins = createMemo(() => [
      {
        name: "out",
        sinks: () => state.out,
        setSinks: (x) => setState("out", x),
      }
    ]);
  }
}
