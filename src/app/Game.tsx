import {
  createFileSystem,
  isUrl,
  parseHtml,
  resolvePath,
  Transform,
  transformModulePaths,
} from "@bigmistqke/repl";
import ts, { ModuleKind } from "typescript";
import {
  AutomergeVfsFile,
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
} from "solid-fs-automerge";
import {
  Accessor,
  Component,
  createComputed,
  createMemo,
  createResource,
  createSignal,
  mapArray,
  on,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";

import preludeIndexHtml from "./prelude/index.html?raw";
import preludeIndexTs from "./prelude/index.ts?raw";
import { asyncFailed, AsyncResult, asyncSuccess } from "control-flow-as-value";
import { SOURCE_FOLDER_NAME } from "../level-builder/LevelBuilder";

import { libUrl as libJsUrl } from "../lib";
import { solidjsUrl } from "../lib/solid-js";
import { pixijsUrl } from "../lib/pixi-js";
import { solidjsStoreUrl } from "../lib/solid-js-store";

let lib = await import(libJsUrl);
console.log(lib);

const currentUrl = window.location.href;
const urlParts = new URL(currentUrl);
const hostnameWithPath = urlParts.protocol + urlParts.host + urlParts.pathname;

function createRepl() {
  const transformJs: Transform = ({ path, source, executables }) => {
    return transformModulePaths(source, (modulePath) => {
      if (modulePath == "prelude") {
        let tmp = libJsUrl;
        if (tmp.startsWith("http:") || tmp.startsWith("https:")) {
          return tmp;
        }
        if (tmp.startsWith("/")) {
          tmp = tmp.slice(1);
        }
        return hostnameWithPath + tmp;
      }
      if (modulePath == "prelude/solid-js") {
        let tmp = solidjsUrl;
        if (tmp.startsWith("http:") || tmp.startsWith("https:")) {
          return tmp;
        }
        if (tmp.startsWith("/")) {
          tmp = tmp.slice(1);
        }
        return hostnameWithPath + tmp;
      }
      if (modulePath == "prelude/solid-js/store") {
        let tmp = solidjsStoreUrl;
        if (tmp.startsWith("http:") || tmp.startsWith("https:")) {
          return tmp;
        }
        if (tmp.startsWith("/")) {
          tmp = tmp.slice(1);
        }
        return hostnameWithPath + tmp;
      }
      if (modulePath == "prelude/pixi.js") {
        let tmp = pixijsUrl;
        if (tmp.startsWith("http:") || tmp.startsWith("https:")) {
          return tmp;
        }
        if (tmp.startsWith("/")) {
          tmp = tmp.slice(1);
        }
        return hostnameWithPath + tmp;
      }
      if (modulePath.startsWith(".")) {
        // Swap relative module-path out with their respective module-url
        const url = executables.get(resolvePath(path, modulePath));
        if (!url) throw "url is undefined";
        return url;
      } else if (isUrl(modulePath)) {
        // Return url directly
        return modulePath;
      } else {
        // Wrap external modules with esm.sh
        return `https://esm.sh/${modulePath}`;
      }
    })!;
  };

  return createFileSystem({
    css: { type: "css" },
    js: {
      type: "javascript",
      transform: transformJs,
    },
    ts: {
      type: "javascript",
      transform({ path, source, executables }) {
        return transformJs({
          path,
          source: ts.transpile(source, {
            module: ModuleKind.ES2022,
          }),
          executables,
        });
      },
    },
    html: {
      type: "html",
      transform(config) {
        return (
          parseHtml(config)
            // Transform content of all `<script type="module" />` elements
            .transformModuleScriptContent(transformJs)
            // Bind relative `src`-attribute of all `<script />` elements
            .bindScriptSrc()
            // Bind relative `href`-attribute of all `<link />` elements
            .bindLinkHref()
            .toString()
        );
      },
    },
  });
}

const Game: Component<{
  vfsDocUrl: string;
  vfs: AutomergeVirtualFileSystem;
}> = (props) => {
  let [iframeElement, setIFrameElement] = createSignal<HTMLIFrameElement>();
  let repl = createRepl();
  repl.writeFile("index.html", preludeIndexHtml);
  repl.writeFile("index.ts", preludeIndexTs);
  let rootFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
  {
    let rootFolder_ = createMemo(() => props.vfs.rootFolder());
    rootFolder = createMemo(() => rootFolder_()());
  }
  let sourceFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
  {
    let sourceFolder_ = createMemo(() => {
      let rootFolder2 = rootFolder();
      if (rootFolder2.type != "Success") {
        return rootFolder2;
      }
      let rootFolder3 = rootFolder2.value;
      let sourceFolderId: string | undefined = undefined;
      for (let entry of rootFolder3.contents) {
        if (entry.name == SOURCE_FOLDER_NAME && entry.type == "Folder") {
          sourceFolderId = entry.id;
          break;
        }
      }
      if (sourceFolderId == undefined) {
        return asyncFailed("Source folder not found.");
      }
      return asyncSuccess(rootFolder3.openFolderById(sourceFolderId));
    });
    sourceFolder = createMemo(() => {
      let tmp = sourceFolder_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  }
  let sourceFiles: Accessor<
    AsyncResult<AutomergeVfsFile<{ source: string }>[]>
  >;
  {
    let sourceFiles_ = createMemo(() => {
      let sourceFolder2 = sourceFolder();
      if (sourceFolder2.type != "Success") {
        return sourceFolder2;
      }
      let sourceFolder3 = sourceFolder2.value;
      return asyncSuccess(
        createMemo(
          mapArray(
            () => sourceFolder3.contents,
            (entry) =>
              createMemo(() => {
                if (entry.type != "File") {
                  return undefined;
                }
                return sourceFolder3.openFileById<{ source: string }>(entry.id);
              }),
          ),
        ),
      );
    });
    sourceFiles = createMemo(() => {
      let tmp = sourceFiles_();
      if (tmp.type != "Success") {
        return tmp;
      }
      let tmp2 = tmp.value();
      let result: AutomergeVfsFile<{ source: string }>[] = [];
      for (let tmp3 of tmp2) {
        let tmp4 = tmp3();
        if (tmp4 == undefined) {
          continue;
        }
        let tmp5 = tmp4();
        if (tmp5.type != "Success") {
          return tmp5;
        }
        result.push(tmp5.value);
      }
      return asyncSuccess(result);
    });
  }
  let sourceFilesAsArray = createMemo(() => {
    let sourceFiles2 = sourceFiles();
    if (sourceFiles2.type == "Pending") {
      return [];
    }
    if (sourceFiles2.type == "Failed") {
      console.log(sourceFiles2.message);
      return [];
    }
    return sourceFiles2.value;
  });
  onMount(() => {
    let iframeReady_ = createMemo(() => {
      let iframeElement2 = iframeElement();
      if (iframeElement2 == undefined) {
        return;
      }
      let iframeElement3 = iframeElement2;
      let iframeWindow = iframeElement3.contentWindow;
      if (iframeWindow == null) {
        return;
      }
      let [ready] = createResource(() => {
        return new Promise<true>((resolve) => {
          let onLoad = () => {
            iframeElement3.removeEventListener("load", onLoad);
            resolve(true);
          };
          iframeElement3.addEventListener("load", onLoad);
        });
      });
      return ready;
    });
    let iframeReady = createMemo(() => iframeReady_()?.() ?? false);
    createComputed(() => {
      if (!iframeReady()) {
        return;
      }
      let iframeElement2 = iframeElement();
      if (iframeElement2 == undefined) {
        return;
      }
      let iframeElement3 = iframeElement2;
      let iframeWindow = iframeElement3.contentWindow;
      if (iframeWindow == null) {
        return;
      }
      createComputed(
        on(
          () => props.vfsDocUrl,
          (vfsDocUrl) => {
            iframeWindow.postMessage({
              type: "SetDocUrl",
              params: {
                docUrl: vfsDocUrl,
              },
            });
          },
        ),
      );
    });
    repl.mkdir("user_code");
    createComputed(() => {
      if (!iframeReady()) {
        return;
      }
      let iframeElement2 = iframeElement();
      if (iframeElement2 == undefined) {
        return;
      }
      let iframeElement3 = iframeElement2;
      let iframeWindow = iframeElement3.contentWindow;
      if (iframeWindow == null) {
        return;
      }
      createComputed(
        mapArray(sourceFilesAsArray, (sourceFile) => {
          createComputed(() => {
            let filePath = "user_code/" + sourceFile.name();
            let source = sourceFile.doc.source;
            untrack(() => repl.writeFile(filePath, source));
            onCleanup(() => {
              repl.rm(filePath);
            });
            createComputed(() => {
              let url = repl.getExecutable(filePath);
              if (url == undefined) {
                return;
              }
              iframeWindow.postMessage({
                type: "UpdateSource",
                url,
              });
              onCleanup(() => {
                iframeWindow.postMessage({
                  type: "DisposeSource",
                  url,
                });
              });
            });
          });
        }),
      );
    });
  });
  return (
    <iframe
      ref={setIFrameElement}
      src={repl.getExecutable("index.html")}
      style="flex-grow: 1;"
    />
  );
};

export default Game;
