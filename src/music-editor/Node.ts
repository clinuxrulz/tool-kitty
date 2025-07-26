import { SetStoreFunction, Store } from "solid-js/store";
import { EcsComponentType } from "../ecs/EcsComponent";
import { Pin } from "./components/Pin";
import { Accessor } from "solid-js";

export interface NodeParams<A extends object> {
  readonly state: Store<A>;
  readonly setState: SetStoreFunction<A>;
}

export interface NodeType<A extends object> {
  readonly componentType: EcsComponentType<A>;

  create(nodeParams: NodeParams<A>): Node<A>;
}

export interface Node<A extends object> {
  readonly nodeParams: NodeParams<A>;
  readonly inputPins?: Accessor<{
    name: Accessor<string>,
    source: Accessor<Pin | undefined>,
    setSource: (x: Pin | undefined) => void,
  }[]>;
  readonly outputPins?: Accessor<{
    name: Accessor<string>,
    sinks: Accessor<Pin[]>,
    setSinks: (x: Pin[]) => void,
  }[]>;
}
