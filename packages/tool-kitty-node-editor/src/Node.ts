import { SetStoreFunction, Store } from "solid-js/store";
import { EcsComponentType } from "tool-kitty-ecs";
import { Pin } from "./Pin";
import { Accessor, Component } from "solid-js";

export interface NodeParams<A extends object> {
  readonly entity: string;
  readonly state: Store<A>;
  readonly setState: SetStoreFunction<A>;
}

export interface NodeType<TYPE_EXT, INST_EXT, A extends object> {
  readonly componentType: EcsComponentType<A>;
  readonly ext: TYPE_EXT;

  create(nodeParams: NodeParams<A>): Node<TYPE_EXT, INST_EXT, A>;
}

export interface Node<TYPE_EXT, INST_EXT, A extends object> {
  readonly type: NodeType<TYPE_EXT, INST_EXT, A>;
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
  readonly disablePan?: Accessor<boolean>;
  readonly ext: INST_EXT;
}
