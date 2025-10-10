/* @refresh reload */
//import "uno.css";
//import "@unocss/reset/tailwind.css";
import { render } from "solid-js/web";
import { HashRouter, Route } from "@solidjs/router";
import "./index.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import {
  Accessor,
  Component,
  createComputed,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  lazy,
  mapArray,
  onCleanup,
  Show,
  untrack,
} from "solid-js";
import App from "./App";
import { createConnectionManagementUi } from "./connection-management/ConnectionManagement";
import {
  DocHandle,
  isValidAutomergeUrl,
  Repo,
} from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import { asyncPending, AsyncResult, asyncSuccess } from "./AsyncResult";
import { createStore } from "solid-js/store";
import { PeerJsAutomergeNetworkAdapter } from "./PeerJsAutomergeNetworkAdapter";
import {
  AutomergeVirtualFileSystem,
  AutomergeVirtualFileSystemState,
} from "solid-fs-automerge";
import { REQUIRED_FOR_KEEPING_MANUAL_CHUNKS } from "./lib";
import MusicEditor from "./music-editor/MusicEditor";
import { EcsWorld } from "tool-kitty-ecs";
import { ModelEditor } from "tool-kitty-model-editor";
const CodeMirror = lazy(() => import("./code-mirror/CodeMirror"));
const AppV2 = lazy(() => import("./app/AppV2"));
const KittyDemoApp = lazy(() => import("./kitty-demo/KittyDemo"));
const PixelEditor = lazy(() => import("./pixel-editor/PixelEditor"));
const LevelBuilder = lazy(() => import("./level-builder/LevelBuilder"));
const ScriptEditor = lazy(() => import("./script-editor/ScriptEditor"));
const ColourPicker = lazy(() => import("./pixel-editor/ColourPicker"));
const ReactiveSimulator = lazy(
  () => import("./reactive-simulator/ReactiveSimulator"),
);
const VectorEditor = lazy(() => import("./vector-editor/VectorEditor"));
const GravityTest = lazy(() => import("./gravity-test/GravityTest"));
const ThreeBody = lazy(() => import("./three-body/ThreeBody"));
const VfsTest = lazy(() => import("./level-builder/VirtualFileSystemTest"));
const AutomergeWebRtcTest = lazy(
  () => import("./automerge-webrtc-test/AutomergeWebRtcTest"),
);
const DebugProjection = lazy(() => import("./DebugProjection"));
const AutoFormsTest = lazy(() => import("./AutoFormsTest"));

const root = document.getElementById("root");

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?",
  );
}

REQUIRED_FOR_KEEPING_MANUAL_CHUNKS();

render(() => {
  let urlParams = new URLSearchParams(window.location.search);
  let lastDocUrl = window.localStorage.getItem("lastDocUrl");
  let initDocumentUrl = urlParams.get("docUrl") ?? lastDocUrl;

  let [broadcastNetworkAdapterIsEnabled, setBroadcastNetworkAdapterIsEnabled] =
    createSignal(false);
  let repo = new Repo({
    storage: new IndexedDBStorageAdapter(),
    network: [], //[new BroadcastChannelNetworkAdapter()],
  });
  let automergeVirtualFileSystemDoc: Accessor<
    DocHandle<AutomergeVirtualFileSystemState> | undefined
  >;
  if (initDocumentUrl == undefined || !isValidAutomergeUrl(initDocumentUrl)) {
    let doc = repo.create(AutomergeVirtualFileSystem.makeEmptyState(repo));
    window.localStorage.setItem("lastDocUrl", doc.url);
    automergeVirtualFileSystemDoc = () => doc;
  } else {
    let [doc] = createResource(() =>
      repo.find<AutomergeVirtualFileSystemState>(initDocumentUrl),
    );
    automergeVirtualFileSystemDoc = doc;
  }

  let vfsDoc = createMemo(() => {
    let [doc, setDoc] = createSignal(automergeVirtualFileSystemDoc());
    return { doc, setDoc };
  });
  let vfsDoc2 = createMemo(() => vfsDoc().doc());
  let setVfsDoc = (doc: DocHandle<AutomergeVirtualFileSystemState>) => {
    untrack(() => vfsDoc().setDoc(doc));
  };

  let connectionManagementDocUrl = createMemo(
    () => automergeVirtualFileSystemDoc()?.url,
  );
  let connectionManagementUi = createConnectionManagementUi({
    documentUrl: connectionManagementDocUrl,
    setDocumentUrl: async (docUrl) => {
      if (!isValidAutomergeUrl(docUrl)) {
        return;
      }
      let doc = await repo.find<AutomergeVirtualFileSystemState>(docUrl);
      setVfsDoc(doc);
    },
  });
  let connections = connectionManagementUi.connections.bind(
    connectionManagementUi,
  );

  let networkAdapters = createMemo(
    mapArray(
      connections,
      (connection) =>
        new PeerJsAutomergeNetworkAdapter({ connection: connection.conn }),
    ),
  );
  createComputed(
    mapArray(networkAdapters, (networkAdapter) => {
      repo.networkSubsystem.addNetworkAdapter(networkAdapter);
      onCleanup(() => {
        // How to remove network adapter?
        //automergeRepo.networkSubsystem.
      });
    }),
  );

  // Make a new file system when the root doc handle
  // changes so the FileTree can reload when peers
  // connect.
  let vfs = createMemo(() => {
    let vfsDoc3 = vfsDoc2();
    return new AutomergeVirtualFileSystem({
      repo,
      docHandle: () => vfsDoc3,
    });
  });

  let App2: Component = () => (
    <App
      onShareVfs={() => {
        let doc = automergeVirtualFileSystemDoc();
        if (doc == undefined) {
          return;
        }
        const url = new URL(window.location.href);
        url.searchParams.set("docUrl", doc.url);
        let url2 = url.toString();
        window.history.pushState(null, "", url2);
        navigator.clipboard.writeText(url2);
      }}
      onDeleteVfs={() => {
        window.localStorage.removeItem("lastDocUrl");
        let _request = indexedDB.deleteDatabase("automerge");
        window.location.reload();
      }}
      vfs={vfs()}
    />
  );
  return (
    <HashRouter>
      <Route path="/" component={App2} />
      <Route path="/kitty-demo" component={KittyDemoApp} />
      <Route path="/pixel-editor" component={() => <PixelEditor />} />
      <Route
        path="/level-builder"
        component={() => <LevelBuilder vfs={vfs()} />}
      />
      <Route path="/script-editor" component={() => <ScriptEditor />} />
      <Route path="/music-editor" component={MusicEditor}/>
      <Route path="/model-editor" component={() => (<ModelEditor style="flex-grow: 1;" world={new EcsWorld()}/>)}/>
      <Route path="/code-mirror" component={() => <CodeMirror />} />
      <Route
        path="/colour-picker"
        component={() => {
          return (
            <div
              style={{
                width: "300px",
                height: "300px",
                display: "flex",
                "flex-direction": "column",
                "margin-left": "20px",
                "margin-top": "20px",
              }}
            >
              <ColourPicker />
            </div>
          );
        }}
      />
      <Route path="/reactive-sim" component={ReactiveSimulator} />
      <Route path="/vector-editor" component={VectorEditor} />
      <Route path="/gravity-test" component={GravityTest} />
      <Route path="/three-body" component={ThreeBody} />
      <Route path="/vfs-test" component={VfsTest} />
      <Route path="/automerge-webrtc-test" component={AutomergeWebRtcTest} />
      <Route
        path="/connection-management"
        component={connectionManagementUi.Render}
      />
      <Route path="/debug-projection" component={DebugProjection} />
      <Route
        path="/app"
        component={() => (
          <Show when={vfsDoc2()}>
            {(vfsDoc3) => (
              <AppV2
                vfsDocUrl={vfsDoc3().url}
                vfs={vfs()}
                ConnectionManagementUi={connectionManagementUi.Render}
                broadcastNetworkAdapterIsEnabled={broadcastNetworkAdapterIsEnabled()}
                enableBroadcastNetworkAdapter={
                  /* @once */ () => {
                    repo.networkSubsystem.addNetworkAdapter(
                      new BroadcastChannelNetworkAdapter(),
                    );
                    setBroadcastNetworkAdapterIsEnabled(true);
                  }
                }
                flushRepo={() => repo.flush()}
              />
            )}
          </Show>
        )}
      />
      <Route path="/auto-forms-test" component={AutoFormsTest} />
    </HashRouter>
  );
}, root!);
