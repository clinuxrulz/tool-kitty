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

const innerWorker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});
const worker = Comlink.wrap<
  WorkerShape & { deleteFile: (path: string) => void }
>(innerWorker);
await worker.initialize();

const TypeScriptUI: Component<{
  preludeSource: string,
}> = (props) => {
  createComputed(() => {
    worker.updateFile({
      path: "/node_modules/prelude/index.ts",
      code: props.preludeSource
    });
  });
  const path = "index.ts";
  let [ divElement, setDivElement, ] = createSignal<HTMLDivElement>();
  onMount(() => {
    let divElement2 = divElement();
    if (divElement2 == undefined) {
      return;
    }
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
