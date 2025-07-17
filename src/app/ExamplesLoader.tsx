import { Component, ComponentProps, createComputed, createMemo, createRoot, For, on, splitProps, untrack } from "solid-js";
import { Overwrite } from "../util";
import { createStore } from "solid-js/store";
import { AutomergeVfsFolder, AutomergeVirtualFileSystem } from "solid-fs-automerge";
import { err, ok, Result } from "control-flow-as-value";

const examples = {
  "Mario Clone": {
    skipPathCharCount: "../../examples/mario_clone/".length,
    sources: import.meta.glob(
      "../../examples/mario_clone/**/*.ts",
      {
        query: "?raw",
        import: "default",
        eager: true,
      }
    ) as Record<string,string>,
    data: import.meta.glob(
      "../../examples/mario_clone/**/*.{json,png}",
      {
        query: "?url",
        import: "default",
        eager: true,
      },
    ) as Record<string,string>,
  },
};

const ExamplesLoader: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      vfs: AutomergeVirtualFileSystem,
      onDone: () => void,
    }
  >
> = (props_) => {
  let [props, rest,] = splitProps(props_, ["vfs", "onDone"]);
  let [state, setState,] = createStore<{
    selectedExampleByName: string | undefined,
  }>({
    selectedExampleByName: undefined,
  });
  return (
    <div {...rest}>
      <div style={{
        "width": "100%",
        "height": "100%",
        "display": "flex",
        "flex-direction": "column",
        "overflow": "hidden",
      }}>
        <div>
          Select an example to load:
        </div>
        <div
          style={{
            "flex-grow": "1",
            "overflow-y": "auto",
          }}
        >
          <table class="table">
            <thead />
            <tbody>
              <For each={Object.keys(examples)}>
                {(example) => {
                  let selected = createMemo(() => state.selectedExampleByName == example);
                  return (
                    <tr
                      classList={{
                        "hover:bg-base-300": true,
                        "bg-base-300": selected(),
                      }}
                      onClick={() => {
                        setState("selectedExampleByName", example);
                      }}
                      style={{
                        "cursor": "pointer",
                      }}
                    >
                      <td>
                        {example}
                      </td>
                    </tr>
                  );
                }}
              </For>
            </tbody>
          </table>
        </div>
        <button
          class="btn btn-primary"
          disabled={state.selectedExampleByName == undefined}
          onClick={async () => {
            if (state.selectedExampleByName == undefined) {
              return;
            }
            let example = examples[state.selectedExampleByName as keyof typeof examples];
            if (example == undefined) {
              return;
            }
            await loadExample(props.vfs, example);
            props.onDone();
          }}
        >
          Load Example
        </button>
      </div>
    </div>
  );
};

async function loadExample(
  vfs: AutomergeVirtualFileSystem,
  example: {
    skipPathCharCount: number,
    sources: Record<string, string>,
    data: Record<string, string>,
  }
) {
  if (!window.confirm("Are you sure you want to load it?, (it will replace your current file system)")) {
    return;
  }
  // clear out existing files/folders
  let rootFolder: AutomergeVfsFolder;
  {
    let r = await new Promise<Result<AutomergeVfsFolder>>((resolve) => {
      createRoot((dispose) => {
        let rootFolder = vfs.rootFolder();
        createComputed(() => {
          let rootFolder2 = rootFolder();
          if (rootFolder2.type == "Pending") {
            return;
          }
          if (rootFolder2.type == "Failed") {
            dispose();
            resolve(err(rootFolder2.message));
            return;
          }
          let rootFolder3 = rootFolder2.value;
          untrack(() => {
            let contents = rootFolder3.contents;
            for (let entry of contents) {
              rootFolder3.removeFileOrFolderById(entry.id);
            }
          });
          dispose();
          resolve(ok(rootFolder3));
        });
      });
    });
    if (r.type == "Err") {
      return r;
    }
    rootFolder = r.value;
  }
  let getOrCreateFolderFromPath = async (atFolder: AutomergeVfsFolder, path: string[]): Promise<Result<{ folder: AutomergeVfsFolder, cleanup: () => void, }>> => {
    if (path.length == 0) {
      return ok({ folder: atFolder, cleanup: () => {}, });
    }
    let part = path[0];
    let nextPath = path.slice(1);
    let r = atFolder.getOrCreateFolder(part);
    if (r.type == "Err") {
      return r;
    }
    let folderId = r.value.id;
    return new Promise((resolve) => {
      createRoot((dispose) => {
        let nextAtFolder = atFolder.openFolderById(folderId);
        createComputed(on(
          nextAtFolder,
          (nextAtFolder) => {
            if (nextAtFolder.type == "Pending") {
              return;
            }
            if (nextAtFolder.type == "Failed") {
              dispose();
              resolve(err(nextAtFolder.message));
              return;
            }
            let nextAtFolder2 = nextAtFolder.value;
            (async () => {
              let r = await getOrCreateFolderFromPath(nextAtFolder2, nextPath);
              if (r.type == "Err") {
                dispose();
                resolve(r);
                return;
              }
              let r2 = r.value;
              resolve(ok({
                folder: r2.folder,
                cleanup: () => {
                  r2.cleanup();
                  dispose();
                },
              }));
            })();
          },
        ));
      });
    });
  };
  // copy example into vfs
  let cleanups: (() => void)[] = [];
  try {
    let folderCache = new Map<string,AutomergeVfsFolder>();
    for (let entry of Object.entries({ ...example.sources, ...example.data, })) {
      let path = entry[0].slice(example.skipPathCharCount);
      let url = entry[1];
      let path2 = path.split("/");
      if (path2.length == 0) {
        continue;
      }
      let folderPath = path2.slice(0, path2.length-1);
      let folderPath2 = folderPath.join("/");
      let folder = folderCache.get(folderPath2);
      if (folder == undefined) {
        let folderPath = path2.slice(0, path2.length-1);
        let folder2 = await getOrCreateFolderFromPath(rootFolder, folderPath);
        if (folder2.type == "Err") {
          console.log(folder2.message);
          continue;
        }
        cleanups.push(folder2.value.cleanup);
        folder = folder2.value.folder;
        folderCache.set(folderPath2, folder);
      }
      let filename = path2[path2.length-1];
      let data: any;
      if (filename.endsWith(".ts")) {
        data = {
          source: url,
        };
      } else if (filename.endsWith(".json")) {
        let data2 = await fetch(url);
        let data3 = await data2.json();
        data = data3;
      } else if (filename.endsWith(".png")) {
        let data2 = await fetch(url);
        let data3 = await data2.blob();
        data = {
          mimeType: data3.type,
          data: new Uint8Array(await data3.arrayBuffer()),
        };
      } else {
        continue;
      }
      let r = folder.createFile(filename, data);
      if (r.type == "Err") {
        console.log(r.message);
      }
    }
  } finally {
    cleanups.forEach((c) => c());
  }
};

export default ExamplesLoader;
