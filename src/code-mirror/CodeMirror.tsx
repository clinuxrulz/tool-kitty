import { type WorkerShape } from "@valtown/codemirror-ts/worker";
import * as Comlink from "comlink";
import {
  Component,
  createComputed,
  createMemo,
  mapArray,
  on,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import { basicSetup, EditorView } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import {
  tsAutocomplete,
  tsFacet,
  tsGoto,
  tsHover,
  tsLinterWorker,
  tsSync,
  tsTwoslash,
} from "@valtown/codemirror-ts";
import {
  acceptCompletion,
  autocompletion,
  completionStatus,
} from "@codemirror/autocomplete";
import { keymap, EditorView as EditorView2 } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { indentLess, indentMore } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { AutomergeVfsFile, AutomergeVfsFolder } from "solid-fs-automerge";
import { ReactiveMap } from "@solid-primitives/map";
import * as Automerge from "@automerge/automerge-repo";

const innerWorker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
const worker = Comlink.wrap<
  WorkerShape & { deleteFile: (path: string) => void }
>(innerWorker);
await worker.initialize();

let relPathToModelAndFileMap = new ReactiveMap<
  string,
  {
    file: AutomergeVfsFile<{ source: string }>;
  }
>();

export function mountAutomergeFolderToCodeMirrorVfsWhileMounted(
  baseFolder: AutomergeVfsFolder,
) {
  let copyFolderContentsToCodeMirrorVfsWhileMounted = (
    relPathPrefix: string,
    pathPrefix: string,
    folder: AutomergeVfsFolder,
  ) => {
    createComputed(
      mapArray(
        () => folder.contents,
        (entry) =>
          createComputed(() => {
            switch (entry.type) {
              case "File": {
                let fileId = entry.id;
                let relPath = relPathPrefix + entry.name;
                let path = pathPrefix + entry.name;
                let file = folder.openFileById<{ source: string }>(fileId);
                createComputed(
                  on(file, (file) => {
                    if (file.type != "Success") {
                      return;
                    }
                    let file2 = file.value;
                    createComputed(
                      on(
                        () => file2.doc.source,
                        (source) => {
                          worker.updateFile({
                            path,
                            code: source,
                          });
                        },
                        { defer: true },
                      ),
                    );
                    let modelAndFile = {
                      file: file2,
                    };
                    relPathToModelAndFileMap.set(relPath, modelAndFile);
                    onCleanup(() => {
                      worker.deleteFile(path);
                      if (
                        relPathToModelAndFileMap.get(relPath) === modelAndFile
                      ) {
                        relPathToModelAndFileMap.delete(relPath);
                      }
                    });
                  }),
                );
                break;
              }
              case "Folder": {
                let folderId = entry.id;
                let subFolder = folder.openFolderById(folderId);
                createComputed(
                  on(subFolder, (subFolder) => {
                    if (subFolder.type != "Success") {
                      return;
                    }
                    let subFolder2 = subFolder.value;
                    copyFolderContentsToCodeMirrorVfsWhileMounted(
                      relPathPrefix + entry.name + "/",
                      pathPrefix + entry.name + "/",
                      subFolder2,
                    );
                  }),
                );
                break;
              }
            }
          }),
      ),
    );
  };
  copyFolderContentsToCodeMirrorVfsWhileMounted("", "file:///", baseFolder);
}

const CodeMirror: Component<{
  path?: string;
}> = (props) => {
  const path = "index.ts";
  let div!: HTMLDivElement;
  onMount(() => {
    let changeHandler = () => {};
    let editor = new EditorView({
      extensions: [
        basicSetup,
        javascript({
          typescript: true,
          jsx: true,
        }),
        oneDark,
        tsFacet.of({
          worker: worker,
          path: path,
        }),
        autocompletion({ override: [tsAutocomplete()] }),
        tsSync(),
        tsLinterWorker(),
        tsHover(),
        tsGoto({}),
        tsTwoslash(),
        keymap.of([
          {
            key: "Tab",
            preventDefault: true,
            shift: indentLess,
            run: (e) => {
              if (!completionStatus(e.state)) return indentMore(e);
              return acceptCompletion(e);
            },
          },
        ]),
        indentUnit.of("  "),
        EditorView2.updateListener.of((update) => {
          if (update.docChanged) {
            changeHandler();
          }
        }),
      ],
      parent: div,
    });
    createComputed(
      on(
        () => props.path,
        (path) => {
          if (path == undefined) {
            return;
          }
          let x = editor.state.facet(tsFacet);
          if (x != null) {
            x.path = path;
          }
        },
      ),
    );
    let modelAndFile = createMemo(() => {
      if (props.path == undefined) {
        return undefined;
      }
      return relPathToModelAndFileMap.get(props.path);
    });
    createComputed(
      on(modelAndFile, (modelAndFile) => {
        if (modelAndFile == undefined) {
          return;
        }
        let file = modelAndFile.file;
        editor.dispatch({
          changes: {
            from: 0,
            to: editor.state.doc.length,
            insert: untrack(() => file.doc.source),
          },
        });
        let skipIt = false;
        let skipIt2 = false;
        changeHandler = () => {
          if (skipIt) {
            return;
          }
          skipIt2 = true;
          try {
            let source = editor.state.doc.toString();
            if (source == undefined) {
              return;
            }
            file.docHandle.change((doc) => {
              Automerge.updateText(doc, ["source"], source);
            });
          } finally {
            skipIt2 = false;
          }
        };
        createComputed(
          on(
            () => file.doc.source,
            (source) => {
              if (skipIt2) {
                return;
              }
              skipIt = true;
              try {
                editor.dispatch({
                  changes: {
                    from: 0,
                    to: editor.state.doc.length,
                    insert: source,
                  },
                });
              } finally {
                skipIt = false;
              }
            },
          ),
        );
      }),
    );
  });
  return (
    <div
      ref={div}
      style="all: initial; width: 100%; height: 100%; overflow: auto;"
    >
      <div ref={div} />
    </div>
  );
};

export default CodeMirror;
