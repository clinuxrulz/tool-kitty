import { NoTrack } from "../util";
import {
  Accessor,
  Component,
  createMemo,
  createSignal,
  For,
  Show,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { generateUsername } from "unique-username-generator";
import Peer, { DataConnection } from "peerjs";
import { inviteCodeToPeerId, makeInviteCode } from "./invite_code";

export type Connection = {
  nickname: string;
  peer: Peer;
  conn: DataConnection;
};

export type Invite = {
  inviteCode: string;
  peer: Peer;
};

export function createConnectionManagementUi(props: {
  documentUrl: Accessor<string | undefined>;
  setDocumentUrl: (docUrl: string) => void;
}): {
  connections: Accessor<Connection[]>;
  Render: Component;
} {
  let [state, setState] = createStore<{
    nickname: string;
    connections: NoTrack<Connection>[];
    pendingInvites: NoTrack<Invite>[];
    toastStack: NoTrack<{ id: {}; Render: Component }>[];
    joinDialogInviteCode: string;
  }>({
    nickname: generateUsername("_"),
    connections: [],
    pendingInvites: [],
    toastStack: [],
    joinDialogInviteCode: "",
  });
  let [inviteDialogElement, setInviteDialogElement] =
    createSignal<HTMLDialogElement>();
  let connections = createMemo(() => state.connections.map((x) => x.value));
  let pushToast = (Render: Component) => {
    let id = {};
    setState(
      "toastStack",
      produce((x) => x.push(new NoTrack({ id, Render }))),
    );
    let timerId = setTimeout(() => {
      setState(
        "toastStack",
        state.toastStack.filter((x) => x.value.id !== id),
      );
      clearTimeout(timerId);
    }, 5000);
  };
  let invite = () => {
    let [copied, setCopied] = createSignal(false);
    let inviteCode = makeInviteCode();
    let peerId = inviteCodeToPeerId(inviteCode);
    let peer = new Peer(peerId);
    let invite: Invite = {
      inviteCode,
      peer,
    };
    peer.on("open", () => {
      peer.on("connection", (conn) => {
        conn.once("data", (peerNickname) => {
          if (typeof peerNickname != "string") {
            return;
          }
          setState(
            "connections",
            produce((x) =>
              x.push(
                new NoTrack({
                  nickname: peerNickname,
                  peer,
                  conn,
                }),
              ),
            ),
          );
          conn.send({
            nickname: state.nickname,
            documentUrl: props.documentUrl() ?? null,
          });
          setState(
            "pendingInvites",
            state.pendingInvites.filter((x) => x.value != invite),
          );
        });
        conn.once("close", () => {
          setState(
            "connections",
            state.connections.filter(
              (connection) => connection.value.peer !== peer,
            ),
          );
        });
      });
      setState(
        "pendingInvites",
        produce((x) => x.push(new NoTrack(invite))),
      );
      pushToast(() => (
        <>
          Invite Code: {inviteCode}
          <button
            class="btn"
            onClick={async () => {
              await navigator.clipboard.writeText(inviteCode);
              setCopied(true);
              let timerId = setTimeout(() => {
                clearTimeout(timerId);
                setCopied(false);
              }, 1000);
            }}
          >
            Copy
          </button>
          <Show when={copied()}>Copied</Show>
        </>
      ));
    });
  };
  let openJoinDialog = () => {
    setState("joinDialogInviteCode", "");
    inviteDialogElement()?.showModal();
  };
  let join = () => {
    inviteDialogElement()?.close();
    let inviteCode = state.joinDialogInviteCode;
    setState("joinDialogInviteCode", "");
    let peerId = inviteCodeToPeerId(inviteCode);
    let peer = new Peer();
    peer.on("open", () => {
      let conn = peer.connect(peerId);
      conn.on("open", () => {
        conn.once("data", (data: any) => {
          let peerNickname = data.nickname;
          let documentUrl = data.documentUrl;
          if (typeof peerNickname != "string") {
            return;
          }
          if (typeof documentUrl != "string") {
            return;
          }
          props.setDocumentUrl(documentUrl);
          setState(
            "connections",
            produce((x) =>
              x.push(
                new NoTrack({
                  nickname: peerNickname,
                  peer,
                  conn,
                }),
              ),
            ),
          );
        });
        conn.send(state.nickname);
        conn.once("close", () => {
          setState(
            "connections",
            state.connections.filter(
              (connection) => connection.value.peer !== peer,
            ),
          );
        });
      });
    });
  };
  let kick = (connection: Connection) => {
    connection.peer.destroy();
  };
  let Render: Component = () => {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          "flex-direction": "column",
          padding: "10px",
          position: "relative",
        }}
      >
        <div>
          <div class="pb-2">
            <label>
              <div style="display: inline-block; padding-right: 5px;">
                Nickname:
              </div>
              <input
                type="text"
                class="input"
                value={state.nickname}
                onInput={(e) => {
                  setState("nickname", e.currentTarget.validationMessage);
                }}
              />
            </label>
          </div>
        </div>
        <div>
          <button
            class="btn btn-outline btn-primary ml-1"
            onClick={() => invite()}
          >
            Invite
          </button>
          <button
            class="btn btn-outline btn-primary ml-1"
            onClick={() => openJoinDialog()}
          >
            Join
          </button>
        </div>
        <div
          style={{
            "flex-grow": "1",
            display: "flex",
            "flex-direction": "column",
            "margin-top": "10px",
          }}
        >
          <div
            style={{
              "flex-grow": "1",
              "overflow-y": "auto",
            }}
          >
            Connections:
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th />
                  <th>Nickname</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <For each={state.connections}>
                  {(connection) => (
                    <tr>
                      <td />
                      <td>{connection.value.nickname}</td>
                      <td>
                        <button
                          class="btn btn-primary"
                          onClick={() => {
                            kick(connection.value);
                          }}
                        >
                          Kick
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
          <div
            style={{
              "flex-grow": "1",
              "overflow-y": "auto",
            }}
          >
            Pending Invites:
            <table class="table table-zebra">
              <thead>
                <tr>
                  <th />
                  <th>Invite Code</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                <For each={state.pendingInvites}>
                  {(pendingInvite) => {
                    let [copied, setCopied] = createSignal(false);
                    return (
                      <tr>
                        <td />
                        <td>{pendingInvite.value.inviteCode}</td>
                        <td>
                          <button
                            class="btn btn-primary"
                            onClick={async () => {
                              await navigator.clipboard.writeText(
                                pendingInvite.value.inviteCode,
                              );
                              setCopied(true);
                              let timerId = setTimeout(() => {
                                clearTimeout(timerId);
                                setCopied(false);
                              }, 1000);
                            }}
                          >
                            Copy
                          </button>
                          <button
                            class="btn btn-primary ml-1"
                            onClick={() => {
                              pendingInvite.value.peer.destroy();
                              setState(
                                "pendingInvites",
                                state.pendingInvites.filter(
                                  (x) => x.value !== pendingInvite.value,
                                ),
                              );
                            }}
                          >
                            Delete
                          </button>
                          <Show when={copied()}>Copied</Show>
                        </td>
                      </tr>
                    );
                  }}
                </For>
              </tbody>
            </table>
          </div>
        </div>
        <Show when={state.toastStack.length != 0}>
          <div class="toast toast-center toast-middle">
            <For each={state.toastStack}>
              {(toast) => (
                <div class="alert alert-info">
                  <toast.value.Render />
                </div>
              )}
            </For>
          </div>
        </Show>
        <dialog ref={setInviteDialogElement} class="modal">
          <div class="modal-box">
            Invite Code:
            <input
              type="text"
              class="input ml-2"
              value={state.joinDialogInviteCode}
              onInput={(e) => {
                setState("joinDialogInviteCode", e.currentTarget.value);
              }}
              onChange={() => {
                join();
              }}
            />
            <button
              class="btn btn-primary"
              onClick={async () => {
                let code = await navigator.clipboard.readText();
                setState("joinDialogInviteCode", code);
              }}
            >
              Paste
            </button>
            <div class="modal-action">
              <button class="btn btn-primary" onClick={() => join()}>
                OK
              </button>
              <form method="dialog">
                {/* if there is a button in form, it will close the modal */}
                <button class="btn">Close</button>
              </form>
            </div>
          </div>
        </dialog>
      </div>
    );
  };
  return {
    connections,
    Render,
  };
}
