import { SetStoreFunction, Store } from "solid-js/store";
import { EcsComponentType } from "../ecs/EcsComponent";
import { Pin } from "./components/Pin";
import { Accessor, Component } from "solid-js";
import { CodeGenCtx } from "./CodeGenCtx";

export interface NodeParams<A extends object> {
  readonly entity: string;
  readonly state: Store<A>;
  readonly setState: SetStoreFunction<A>;
}

export interface NodeType<A extends object> {
  readonly componentType: EcsComponentType<A>;
  readonly registerAudioWorkletModules?: (audioCtx: AudioContext) => void;
  readonly initAudioCtx?: (audioCtx: AudioContext, workletNode: AudioWorkletNode) => Promise<void>;
  readonly generateInitOnceCode?: (params: {
    ctx: CodeGenCtx,
  }) => void;

  create(nodeParams: NodeParams<A>): Node<A>;
}

export interface Node<A extends object> {
  readonly type: NodeType<A>;
  readonly nodeParams: NodeParams<A>;
  readonly inputPins?: Accessor<{
    name: string,
    source: Accessor<Pin | undefined>,
    setSource: (x: Pin | undefined) => void,
    isEffectPin?: boolean,
  }[]>;
  readonly outputPins?: Accessor<{
    name: string,
    sinks: Accessor<Pin[]>,
    setSinks: (x: Pin[]) => void,
    isEffectPin?: boolean,
  }[]>;
  readonly ui?: Accessor<Component | undefined>;
  readonly init?: (workletNode: AudioWorkletNode) => Promise<void>;
  generateUnorderedInitCode?: (params: {
    ctx: CodeGenCtx,
  }) => void;
  generateCode?: (params: {
    ctx: CodeGenCtx,
    inputAtoms: Map<string,string>,
  }) => {
    outputAtoms: Map<string,string>,
  }[];
}
