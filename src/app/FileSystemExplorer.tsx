import {
  Accessor,
  Component,
  createComputed,
  createMemo,
  createSignal,
  onCleanup,
  Show,
} from "solid-js";
import {
  DefaultIndentGuide,
  FileSystem,
  FileTree,
} from "@bigmistqke/solid-fs-components";
import { ReactiveMap } from "@solid-primitives/map";
import {
  AutomergeVirtualFileSystem,
  createAutomergeFs,
} from "solid-fs-automerge";

export const createFileSystemExplorer: (props: {
  vfs: AutomergeVirtualFileSystem;
  selected?: string;
  onSelect?(path: string): void;
}) => {
  fs: Accessor<FileSystem<Blob>>;
  isSelected: (path: string) => boolean;
  selectionCount: () => number;
  Render: Component;
} = (props) => {
  let fs = createMemo(() => createAutomergeFs(props.vfs));
  let selectionMap = new ReactiveMap<string, Accessor<boolean>>();
  let isSelected = (path: string) => selectionMap.get(path)?.() ?? false;
  let [selectionCount, setSelectionCount] = createSignal(0);
  let Render: Component = () => (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
      <Show when={fs()}>
        {(fs2) => (
          <FileTree
            fs={fs2()}
            style={{
              display: "grid",
              height: "100vh",
              "align-content": "start",
            }}
          >
            {(dirEnt) => {
              createComputed(() => {
                let path = dirEnt().path;
                let selected = () => dirEnt().selected;
                createComputed(() => {
                  if (!selected()) {
                    return;
                  }
                  setSelectionCount((x) => x + 1);
                  onCleanup(() => {
                    setSelectionCount((x) => x - 1);
                  });
                });
                selectionMap.set(path, selected);
                onCleanup(() => {
                  if (selectionMap.get(path) === selected) {
                    selectionMap.delete(path);
                  }
                });
              });
              let [editable, setEditable] = createSignal(false);
              return (
                <FileTree.DirEnt
                  style={{
                    "text-align": "left",
                    display: "flex",
                    margin: "0px",
                    padding: "0px",
                    border: "none",
                    color: "white",
                    background: dirEnt().selected ? "blue" : "none",
                  }}
                >
                  <FileTree.IndentGuides
                    render={() => (
                      <DefaultIndentGuide color="white" width={15} />
                    )}
                  />
                  <FileTree.Expanded
                    collapsed="-"
                    expanded="+"
                    style={{ width: "15px", "text-align": "center" }}
                  />
                  <FileTree.Name
                    editable={editable()}
                    style={{
                      "margin-left":
                        dirEnt().type === "file" ? "7.5px" : undefined,
                    }}
                    onBlur={() => setEditable(false)}
                  />
                </FileTree.DirEnt>
              );
            }}
          </FileTree>
        )}
      </Show>
    </div>
  );
  let element = Render({});
  let Render2: Component = () => element;
  return {
    fs,
    isSelected,
    selectionCount,
    Render: Render2,
  };
};
