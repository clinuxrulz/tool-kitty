import { Component, For } from "solid-js";
import { createStore, produce } from "solid-js/store";
import Peer, { DataConnection } from "peerjs";
import { NoTrack } from "../util";

const PEER_ID_PREFIX = "7ae48d46-10f2-kitty-";

const InviteJoinUiForPeerJs: Component<{
  onConnection: (params: { connection: DataConnection }) => void;
}> = (props) => {
  let [state, setState] = createStore<{
    pendingInvites: NoTrack<{
      inviteCode: string;
      peer: Peer;
    }>[];
  }>({
    pendingInvites: [],
  });
  return (
    <div>
      <button
        class="btn"
        style="margin-left: 5px;"
        onClick={async () => {
          let inviteCode = makeInviteCode();
          let peer = new Peer(PEER_ID_PREFIX + inviteCode);
          peer.on("open", (id) => {
            console.log(id);
            peer.on("error", (err) => {
              console.log(err);
            });
            peer.on("connection", (conn) => {
              conn.on("open", () => {
                props.onConnection({
                  connection: conn,
                });
                setState("pendingInvites", (x) =>
                  x.filter((x2) => x2.value.peer != peer),
                );
              });
            });
            setState(
              "pendingInvites",
              produce((x) =>
                x.push(
                  new NoTrack({
                    inviteCode,
                    peer,
                  }),
                ),
              ),
            );
          });
        }}
      >
        Invite
      </button>
      <button
        class="btn"
        style="margin-left: 5px;"
        onClick={async () => {
          let inviteCode = window.prompt("Enter invite code:");
          if (inviteCode == null) {
            return;
          }
          inviteCode = inviteCode.trim();
          if (inviteCode == "") {
            return;
          }
          let peer = new Peer();
          peer.on("open", (id) => {
            console.log(id);
            peer.on("error", (err) => {
              console.log(err);
            });
            let conn = peer.connect(PEER_ID_PREFIX + inviteCode);
            conn.on("open", () => {
              props.onConnection({
                connection: conn,
              });
            });
          });
        }}
      >
        Join
      </button>
      <br />
      <For each={state.pendingInvites}>
        {(invite) => (
          <>
            Invite: {invite.value.inviteCode}
            <br />
          </>
        )}
      </For>
    </div>
  );
};

export default InviteJoinUiForPeerJs;

function makeInviteCode(): string {
  let s = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; ++i) {
    let x = Math.floor(Math.random() * s.length);
    code += s.substring(x, x + 1);
  }
  return code;
}
