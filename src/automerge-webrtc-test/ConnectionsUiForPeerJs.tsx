import { Accessor, Component } from "solid-js";
import { createStore } from "solid-js/store";
import InviteJoinUiForPeerJs from "./InviteJoinUiForPeerJs";
import { DataConnection } from "peerjs";

export function createConnectionsUiForPeerJs(): {
  connections: Accessor<DataConnection[]>;
  Render: Component;
} {
  let [state, setState] = createStore<{
    connections: DataConnection[];
  }>({
    connections: [],
  });
  let Render: Component = () => {
    return (
      <>
        <InviteJoinUiForPeerJs
          onConnection={(params) => {
            setState("connections", (connections) => [
              ...connections,
              params.connection,
            ]);
          }}
        />
      </>
    );
  };
  return {
    connections: () => state.connections,
    Render,
  };
}
