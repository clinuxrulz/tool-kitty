import { A, useNavigate } from "@solidjs/router";
import { AutomergeVirtualFileSystem } from "solid-fs-automerge";
import { importFromZip } from "solid-fs-automerge/src/export-import";
import { untrack } from "solid-js";
import { Component } from "solid-js";

const App: Component<{
  onShareVfs: () => void;
  onDeleteVfs: () => void;
  vfs: AutomergeVirtualFileSystem;
}> = (props) => {
  let navigate = useNavigate();
  return (
    <div style="flex-grow: 1; overflow: auto; ">
      <button
        class="btn btn-primary"
        onClick={() => {
          props.onShareVfs();
        }}
      >
        Share Virtual File System
      </button>
      <br />
      <button
        class="btn btn-secondary"
        onClick={() => {
          let deleteIt = window.confirm(
            "Are you sure you wish to delete your virtual file system?",
          );
          if (deleteIt) {
            props.onDeleteVfs();
          }
        }}
      >
        Delete Virtual File System
      </button>
      <br />
      {untrack(() => {
        let fileInputElement!: HTMLInputElement;
        return (
          <button
            class="btn btn-primary"
            onClick={() => {
              fileInputElement.click();
            }}
          >
            Import Virtual File System
            <input
              ref={fileInputElement}
              type="file"
              hidden
              onChange={() => {
                let files = fileInputElement.files;
                if (files == null) {
                  return;
                }
                if (files.length != 1) {
                  return;
                }
                importFromZip({ file: files[0], vfs: props.vfs });
              }}
            />
          </button>
        );
      })}
      <br />
      <b>Links:</b>
      <br />
      <div
        style={{
          "margin-left": "10px",
          "margin-top": "10px",
          display: "inline-block",
        }}
      >
        <div
          style={{
            display: "flex",
            "flex-direction": "column",
          }}
        >
          <button class="btn" onClick={() => navigate("/kitty-demo")}>
            Kitty Demo
          </button>
          <button class="btn" onClick={() => navigate("/pixel-editor")}>
            Pixel Editor
          </button>
          <button class="btn" onClick={() => navigate("/level-builder")}>
            Level Builder
          </button>
          <button class="btn" onClick={() => navigate("/music-editor")}>
            Music Editor
          </button>
          <button class="btn" onClick={() => navigate("/script-editor")}>
            Script Editor
          </button>
          <button class="btn" onClick={() => navigate("/colour-picker")}>
            Colour Picker
          </button>
          <button class="btn" onClick={() => navigate("/reactive-sim")}>
            Reactive Simulator
          </button>
          <button class="btn" onClick={() => navigate("/vector-editor")}>
            Vector Editor
          </button>
          <button class="btn" onClick={() => navigate("/gravity-test")}>
            Gravity Test
          </button>
          <button class="btn" onClick={() => navigate("/three-body")}>
            Three Body
          </button>
          <button class="btn" onClick={() => navigate("/vfs-test")}>
            Virtual File System Test
          </button>
          <button
            class="btn"
            onClick={() => navigate("/automerge-webrtc-test")}
          >
            Automerge WebRTC Test
          </button>
          <button
            class="btn"
            onClick={() => navigate("/connection-management")}
          >
            Connection Management
          </button>
          <button class="btn" onClick={() => navigate("/debug-projection")}>
            Debug Projection
          </button>
          <button class="btn" onClick={() => navigate("/app")}>
            App
          </button>
          <button class="btn" onClick={() => navigate("/auto-forms-test")}>
            Auto Forms Test
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
