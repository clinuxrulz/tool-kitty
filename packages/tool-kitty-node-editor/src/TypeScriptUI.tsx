import { type WorkerShape } from "@valtown/codemirror-ts/worker";
import * as Comlink from "comlink";
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
import { createFileSystem, isUrl, parseHtml, resolvePath, Transform, transformModulePaths } from "@bigmistqke/repl";
import ts, { ModuleKind } from "typescript";

const innerWorker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
const worker = Comlink.wrap<
  WorkerShape & { deleteFile: (path: string) => void }
>(innerWorker);
await worker.initialize();

function createRepl() {
  const transformJs: Transform = ({ path, source, executables }) => {
    return transformModulePaths(source, (modulePath) => {
      /*
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
      */
      if (modulePath == "prelude" || modulePath.startsWith(".")) {
        if (modulePath == "prelude") {
          modulePath = "node_modules/prelude/index.ts";
        }
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

const TypeScriptUI: Component<{
  preludeSource: string,
}> = (props) => {
  createComputed(() => {
    worker.updateFile({
      path: "/node_modules/prelude/index.ts",
      code: props.preludeSource
    });
  });
  let repl = createRepl();
  repl.mkdir("node_modules/prelude", {
    recursive: true,
  });
  repl.writeFile(
    "node_modules/prelude/index.ts",
    props.preludeSource
  );
  const path = "index.ts";
  repl.writeFile(path, "");
  let [ divElement, setDivElement, ] = createSignal<HTMLDivElement>();
  onMount(() => {
    let divElement2 = divElement();
    if (divElement2 == undefined) {
      return;
    }
    let changeHandler = () => {
      let source = editor.state.doc.toString();
      repl.writeFile(path, source);
    };
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
      parent: divElement2,
    });
  });
  return (
    <div
      style="all: initial; width: 100%; height: 100%; overflow: auto;"
    >
      <div ref={setDivElement}/>
    </div>
  );
};

export default TypeScriptUI;
