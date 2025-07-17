import {
  Component,
  createComputed,
  createMemo,
  createSignal,
  mapArray,
  on,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import type { editor } from "monaco-editor";

import loader from "@monaco-editor/loader";
import { AutomergeVfsFile, AutomergeVfsFolder } from "solid-fs-automerge";
import * as Automerge from "@automerge/automerge-repo";
import { ReactiveMap } from "@solid-primitives/map";

//

const libTypeDef = import.meta.glob("../../types/**/*.d.ts", {
  as: "raw",
  eager: true,
});
const libTypeDef2: Record<string, string> = {};
for (let path in libTypeDef) {
  libTypeDef2["prelude/" + path.slice("../../types/".length)] =
    libTypeDef[path];
}

//

const solidjsTypeDef = import.meta.glob(
  "../../node_modules/solid-js/**/*.d.ts",
  { as: "raw", eager: true },
);
const solidjsTypeDef2: Record<string, string> = {};
for (let path in solidjsTypeDef) {
  solidjsTypeDef2["prelude/" + path.slice("../../node_modules/".length)] =
    solidjsTypeDef[path];
}

//

const pixiTypeDefs = import.meta.glob("../../node_modules/pixi.js/**/*.d.ts", {
  as: "raw",
  eager: true,
});
let pixiTypeDefs2: Record<string, string> = {};
for (let path in pixiTypeDefs) {
  pixiTypeDefs2["prelude/" + path.slice("../../node_modules/".length)] =
    pixiTypeDefs[path];
}

//

const types: Record<string, string> = {
  ...libTypeDef2,
  ...solidjsTypeDef2,
  ...pixiTypeDefs2,
};

let monaco = await loader.init();

const isAndroid = navigator && /android/i.test(navigator.userAgent);

let relPathToModelAndFileMap = new ReactiveMap<
  string,
  {
    model: ReturnType<(typeof monaco)["editor"]["createModel"]>;
    file: AutomergeVfsFile<{ source: string }>;
  }
>();

export function mountAutomergeFolderToMonacoVfsWhileMounted(
  baseFolder: AutomergeVfsFolder,
) {
  for (let [typeFile, typeDecl] of Object.entries(types)) {
    let dispose = monaco.languages.typescript.typescriptDefaults.addExtraLib(
      typeDecl,
      typeFile,
    );
    onCleanup(() => dispose.dispose());
  }
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    paths: {
      prelude: ["./prelude/lib.js"],
      "prelude/solid-js": ["./prelude/solid-js/types/index.js"],
      "prelude/solid-js/store": ["./prelude/solid-js/store/types/index.js"],
      "prelude/pixi.js": ["./prelude/pixi.js/lib/index.js"],
    },
  });
  let copyFolderContentsToMonocoVfsWhileMounted = (
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
                    let model = monaco.editor.createModel(
                      untrack(() => file2.doc.source),
                      "typescript",
                      monaco.Uri.parse(path),
                    );
                    createComputed(
                      on(
                        () => file2.doc.source,
                        (source) => {
                          model.setValue(source);
                        },
                        { defer: true },
                      ),
                    );
                    let modelAndFile = {
                      model,
                      file: file2,
                    };
                    relPathToModelAndFileMap.set(relPath, modelAndFile);
                    onCleanup(() => {
                      model.dispose();
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
                    copyFolderContentsToMonocoVfsWhileMounted(
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
  copyFolderContentsToMonocoVfsWhileMounted("", "file:///", baseFolder);
}

const ScriptEditor: Component<{
  path?: string;
}> = (props) => {
  let [div, setDiv] = createSignal<HTMLDivElement>();
  let [editor2, setEditor2] = createSignal<editor.IStandaloneCodeEditor>();
  onMount(() => {
    let div2 = div();
    if (div2 == undefined) {
      return;
    }
    let editor = monaco.editor.create(div2, {
      language: "typescript",
      quickSuggestions: {
        other: !isAndroid,
        comments: !isAndroid,
        strings: !isAndroid,
      },
      automaticLayout: true,
      acceptSuggestionOnCommitCharacter: !isAndroid,
      acceptSuggestionOnEnter: !isAndroid ? "on" : "off",
      accessibilitySupport: !isAndroid ? "on" : "off",
      theme: "vs-dark",
    });
    setEditor2(editor);
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
        let model = modelAndFile.model;
        let file = modelAndFile.file;
        editor.setModel(model);
        let skipIt = false;
        let changeHandler = () => {
          if (skipIt) {
            return;
          }
          let source = editor2()?.getModel()?.getValue();
          if (source == undefined) {
            return;
          }
          file.docHandle.change((doc) => {
            Automerge.updateText(doc, ["source"], source);
          });
        };
        let dispose = model?.onDidChangeContent(changeHandler);
        onCleanup(() => {
          if (dispose != undefined) {
            dispose.dispose();
          }
        });
        createComputed(
          on(
            () => file.doc.source,
            (source) => {
              skipIt = true;
              try {
                model.setValue(source);
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
      ref={setDiv}
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    ></div>
  );
};

export default ScriptEditor;
