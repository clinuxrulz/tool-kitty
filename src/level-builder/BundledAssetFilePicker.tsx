import JSZip, { folder } from "jszip";
import { ReactiveSet } from "@solid-primitives/set";
import { asyncFailed, asyncPending, AsyncResult, asyncSuccess, Result } from "control-flow-as-value";
import { Accessor, Component, createMemo, createSignal, For, mapArray, Match, onMount, Show, Switch } from "solid-js";

const bundledAssets_ = import.meta.glob(
  "../../bundled_assets/*.zip",
  {
    query: "?url",
    eager: true,
  }
) as Record<string,{ default: string, }>;
let bundledAssets_2: Record<string,string> = {};
{
  let pathSkipSize = "../../bundled_assets/".length;
  for (let [ path, url ] of Object.entries(bundledAssets_)) {
    let url2 = url.default;
    let path2 = path.slice(pathSkipSize);
    bundledAssets_2[path2] = url2;
  }
}
export const bundledAssets = bundledAssets_2;

type TreeNode = {
  type: "Folder",
  name: string,
  children: () => Accessor<AsyncResult<TreeNode[]>>,
} | {
  type: "File",
  name: string,
};

const BundledAssetFilePicker: Component<{
  isFileChoosable: (filename: string) => boolean,
  chooseText: string,
  onChoose: (path: string) => void,
}> = (props) => {
  let tree: Accessor<TreeNode[]>;
  {
    let tree_ = Object.entries(bundledAssets_2)
      .map(
        ([ filename, url ]) =>
          bundledZipToTreeNode({ filename, url, })
      );
    tree = () => tree_;
  }
  let expandedSet = new ReactiveSet<string>();
  let { Render: RenderTree } = createRenderTree({
    get tree() {
      return tree();
    },
    isExpanded: (name) => expandedSet.has(name),
    setExpanded: (name, expanded) => {
      if (expanded) {
        expandedSet.add(name);
      } else {
        expandedSet.delete(name);
      }
    },
    atPath: undefined,
    isFileChoosable: props.isFileChoosable,
    get chooseText() {
      return props.chooseText;
    },
    onChoose: props.onChoose,
  });
  return (<RenderTree/>);
};

function createRenderTree(props: {
  tree: TreeNode[],
  isExpanded: (name: string) => boolean,
  setExpanded: (name: string, expanded: boolean) => void,
  atPath: string | undefined,
  isFileChoosable: (filename: string) => boolean,
  chooseText: string,
  onChoose: (path: string) => void,
}): {
  firstRowHeight: Accessor<number | undefined>,
  height: Accessor<number | undefined>,
  rowsWithHeights: Accessor<{
    firstRowHeight: Accessor<number | undefined>,
    height: Accessor<number | undefined>,
  }[]>,
  Render: Component,
} {
  let rowsWithHeights = createMemo(mapArray(
    () => props.tree,
    (treeNode) => {
      switch (treeNode.type) {
        case "Folder": {
          return createRenderFolder({
            folder: treeNode,
            isExpanded: props.isExpanded,
            setExpanded: props.setExpanded,
            atPath:
              props.atPath == undefined ?
                treeNode.name :
                `${props.atPath}/${treeNode.name}`,
            isFileChoosable: props.isFileChoosable,
            get chooseText() {
              return props.chooseText;
            },
            onChoose: props.onChoose,
          });
        }
        case "File": {
          let tmp = createRenderFile({
            file: treeNode,
            atPath:
              props.atPath == undefined ?
                treeNode.name :
                `${props.atPath}/${treeNode.name}`,
            isFileChoosable: props.isFileChoosable,
            get chooseText() {
              return props.chooseText;
            },
            onChoose: props.onChoose,
          });
          return {
            firstRowHeight: tmp.height,
            height: tmp.height,
            Render: tmp.Render,
          };
        }
      }
    },
  ));
  let firstRowHeight = createMemo(() => {
    let rowsWithHeights2 = rowsWithHeights();
    if (rowsWithHeights2.length == 0) {
      return undefined;
    }
    return rowsWithHeights2[0].firstRowHeight();
  });
  let height = createMemo(() => {
    let rowsWithHeights2 = rowsWithHeights();
    if (rowsWithHeights2.length == 0) {
      return undefined;
    }
    let total = 0.0;
    for (let entry of rowsWithHeights2) {
      let height = entry.height();
      if (height == undefined) {
        return undefined;
      }
      total += height;
    }
    return total;
  });
  return {
    firstRowHeight,
    height,
    rowsWithHeights,
    Render: () => (
      <div>
        <For each={rowsWithHeights()}>
          {(row) => (
            <div
              style={{
                display: "flex",
                "flex-direction": "row",
              }}
            >
              <Show when={row.firstRowHeight()}>
                {(height) => (
                  <div
                    style={{
                      "margin-top": `${0.5 * height() - 1}px`,
                      "margin-left": "-5px",
                      height: "2px",
                      width: "10px",
                      "background-color": "green",
                    }}
                  />
                )}
              </Show>
              <row.Render/>
            </div>
          )}
        </For>
      </div>
    )
  };
}

function createRenderFolder(props: {
  folder: Extract<TreeNode, { type: "Folder", }>,
  isExpanded: (name: string) => boolean,
  setExpanded: (name: string, expanded: boolean) => void,
  atPath: string,
  isFileChoosable: (filename: string) => boolean,
  chooseText: string,
  onChoose: (path: string) => void,
}): {
  firstRowHeight: Accessor<number | undefined>,
  height: Accessor<number | undefined>,
  Render: Component,
} {
  let children = props.folder.children();
  let childrenFailed = createMemo(() => {
    let children2 = children();
    if (children2.type != "Failed") {
      return undefined;
    }
    return children2.message;
  });
  let childrenSuccess = createMemo(() => {
    let children2 = children();
    if (children2.type != "Success") {
      return undefined;
    }
    return children2.value;
  });
  let hasChildrenSuccess = createMemo(() =>
    childrenSuccess() != undefined
  );
  let renderTree = createMemo(() => {
    if (!hasChildrenSuccess()) {
      return undefined;
    }
    return createRenderTree({
      get tree() {
        return childrenSuccess()!;
      },
      isExpanded: (name) =>
        props.isExpanded(`${props.folder.name}/${name}`),
      setExpanded: (name, expanded) =>
        props.setExpanded(`${props.folder.name}/${name}`, expanded),
      atPath: props.atPath,
      isFileChoosable: props.isFileChoosable,
      get chooseText() {
        return props.chooseText;
      },
      onChoose: props.onChoose,
    });
  });
  let rowsWithHeights = createMemo(() => renderTree()?.rowsWithHeights?.() ?? []);
  let [ firstRowHeight, setFirstRowHeight, ] = createSignal<number>();
  let height = createMemo(() => {
    if (!props.isExpanded(props.folder.name)) {
      return firstRowHeight();
    }
    let firstRowHeight2 = firstRowHeight();
    if (firstRowHeight2 == undefined) {
      return undefined;
    }
    let treeHeight = renderTree()?.height?.();
    if (treeHeight == undefined) {
      return undefined;
    }
    return firstRowHeight2 + treeHeight;
  });
  let lastRowFirstRowHeight = createMemo(() => {
    let rowsWithHeights2 = rowsWithHeights();
    if (rowsWithHeights2.length == 0) {
      return undefined;
    }
    return rowsWithHeights2[rowsWithHeights2.length-1].firstRowHeight();
  });
  let vlineHeight = createMemo(() => {
    let rowsWithHeights2 = rowsWithHeights();
    if (rowsWithHeights2.length == 0) {
      return undefined;
    }
    let firstRowHeight2 = firstRowHeight();
    if (firstRowHeight2 == undefined) {
      return undefined;
    }
    let lastRowFirstRowHeight2 = lastRowFirstRowHeight();
    if (lastRowFirstRowHeight2 == undefined) {
      return undefined;
    }
    let total = 0.5 * firstRowHeight2 + 0.5 * lastRowFirstRowHeight2;
    for (let i = 0; i < rowsWithHeights2.length-1; ++i) {
      let height = rowsWithHeights2[i].height();
      if (height == undefined) {
        return undefined;
      }
      total += height;
    }
    return total;
  });
  let vline = createMemo(() => {
    let firstRowHeight2 = firstRowHeight();
    if (firstRowHeight2 == undefined) {
      return undefined;
    }
    let vlineHeight2 = vlineHeight();
    if (vlineHeight2 == undefined) {
      return undefined;
    }
    return {
      offsetY: 0.5 * firstRowHeight2,
      height: vlineHeight2,
    };
  });
  return {
    firstRowHeight,
    height,
    Render: () => {
      let rowDiv!: HTMLDivElement;
      onMount(() => {
        let rect = rowDiv.getBoundingClientRect();
        setFirstRowHeight(rect.height);
      });
      return (
        <div
          style={{
            display: "flex",
            "flex-direction": "row",
          }}
        >
          <div
            style={{
              display: "flex",
              "flex-direction": "column",
            }}
          >
            <Show when={firstRowHeight()}>
              {(firstRowHeight) => (<>
                <div
                  style={{
                    display: "flex",
                    "margin-top": `${0.5 * (firstRowHeight() - 15)}px`,
                    width: "15px",
                    height: "15px",
                    border: "1px solid green",
                    color: "green",
                    "justify-content": "center",
                    "align-items": "center",
                    "cursor": "pointer",
                  }}
                  onClick={() => {
                    props.setExpanded(
                      props.folder.name,
                      !props.isExpanded(
                        props.folder.name,
                      ),
                    );
                  }}
                >
                  <span
                    style={{
                      "font-size": "20px",
                      "line-height": "1",
                    }}
                  >
                    <Switch
                      fallback={"+"}
                    >
                      <Match when={props.isExpanded(props.folder.name)}>
                        -
                      </Match>
                    </Switch>
                  </span>
                </div>
                <Show when={props.isExpanded(props.folder.name)}>
                  <Show when={vline()}>
                    {(vline) => (
                      <div>
                        <div
                          style={{
                            "margin-left": `${0.5 * 15}px`,
                            "margin-top": `${0}px`,
                            "margin-right": "5px",
                            height: `${vline().height - vline().offsetY - 0.5 * 15 + 0.5 * firstRowHeight() + 1}px`,
                            width: "2px",
                            "background-color": "green",
                          }}
                        />
                      </div>
                    )}
                  </Show>
                </Show>
              </>)}
            </Show>
          </div>
          <div>
            <div ref={rowDiv}>{props.folder.name}</div>
            <Show when={props.isExpanded(props.folder.name)}>
              <div>
                <Switch>
                  <Match when={children().type == "Pending"}>
                    Loading...
                  </Match>
                  <Match when={childrenFailed()} keyed>
                    {(error) => (<>Error: {error}</>)}
                  </Match>
                  <Match when={renderTree()} keyed>
                    {(renderTree) => (<renderTree.Render/>)}
                  </Match>
                </Switch>
              </div>
            </Show>
          </div>
        </div>
      );
    },
  };
}

function createRenderFile(props: {
  file: Extract<TreeNode, { type: "File", }>,
  atPath: string,
  isFileChoosable: (filename: string) => boolean,
  chooseText: string,
  onChoose: (path: string) => void,
}): {
  height: Accessor<number | undefined>,
  Render: Component,
} {
  let [ height, setHeight ] = createSignal<number>();
  return {
    height,
    Render: () => {
      let rowDiv!: HTMLDivElement;
      onMount(() => {
        let rect = rowDiv.getBoundingClientRect();
        setHeight(rect.height);
      });
      return (
        <div ref={rowDiv}>
          {props.file.name}
          <Show when={props.isFileChoosable(props.file.name)}>
            <button
              class="btn btn-sm btn-primary"
              onClick={() => props.onChoose(props.atPath)}
            >
              {props.chooseText}
            </button>
          </Show>
        </div>
      );
    },
  };
}

function bundledZipToTreeNode(params: { filename: string, url: string, }): TreeNode {
  let { filename, url, } = params;
  return {
    type: "Folder",
    name: filename,
    children: () => bundledZipUrlToChildTreeNodes({ url, }),
  };
}

function bundledZipUrlToChildTreeNodes(params: { url: string, }): Accessor<AsyncResult<TreeNode[]>> {
  let { url, } = params;
  let zip: Accessor<AsyncResult<JSZip>>;
  {
    let [ result, setResult, ] = createSignal<AsyncResult<JSZip>>(asyncPending());
    (async () => {
      try {
        let response = await fetch(url);
        let blob = await response.blob();
        let zip = await JSZip.loadAsync(blob);
        setResult(asyncSuccess(zip));
      } catch (e) {
        setResult(asyncFailed(`Failed to load zip: ${e}`));
      }
    })();
    zip = result;
  }
  let result = createMemo(() => {
    let zip2 = zip();
    if (zip2.type != "Success") {
      return zip2;
    }
    let zip3 = zip2.value;
    return asyncSuccess(bundledZipToChildTreeNodes({ zip: zip3, }));
  });
  return createMemo(() => {
    let result2 = result();
    if (result2.type != "Success") {
      return result2;
    }
    let result3 = result2.value;
    return result3();
  });
}

type ZipTreeNode = {
  type: "Folder",
  children: Map<string,ZipTreeNode>,
} | {
  type: "File",
};

function bundledZipToChildTreeNodes(params: { zip: JSZip, }): Accessor<AsyncResult<TreeNode[]>> {
  let { zip, } = params;
  let zipTree = new Map<string,ZipTreeNode>();
  let zipTreeRootFolderNode: Extract<ZipTreeNode, { type: "Folder", }> = {
    type: "Folder",
    children: zipTree,
  };
  let navigate = (path: string[]): Extract<ZipTreeNode, { type: "Folder", }> => {
    let pathStack = [ ...path, ].reverse();
    let at: Extract<ZipTreeNode, { type: "Folder", }> = zipTreeRootFolderNode;
    while (true) {
      let pathPart = pathStack.pop();
      if (pathPart == undefined) {
        break;
      }
      let nextAt = at.children.get(pathPart);
      if (nextAt?.type != "Folder") {
        nextAt = {
          type: "Folder",
          children: new Map(),
        };
        at.children.set(pathPart, nextAt);
      }
      at = nextAt;
    }
    return at;
  };
  for (let [ path, data, ] of Object.entries(zip.files)) {
    if (data.dir) {
      continue;
    }
    let path2 = path.split("/");
    let folderPath = path2.slice(0, path2.length - 1);
    let filename = path2[path2.length - 1];
    let folderNode = navigate(folderPath);
    folderNode.children.set(
      filename,
      {
        type: "File",
      },
    );
  }
  return bundledZipTreeToChildren({ zip, zipTree, });
}

function bundledZipTreeToChildren(params: { zip: JSZip, zipTree: Map<string,ZipTreeNode>, }): Accessor<AsyncResult<TreeNode[]>> {
  let { zip, zipTree, } = params;
  let result: TreeNode[] = Array.from(
    zipTree
      .entries()
      .map(
        ([ pathPart, node, ]) => {
          switch (node.type) {
            case "Folder": {
              return {
                type: "Folder",
                name: pathPart,
                children: () => bundledZipTreeToChildren({
                  zip,
                  zipTree: node.children,
                }),
              };
            }
            case "File": {
              return {
                type: "File",
                name: pathPart,
              };
            }
          }
        },
      )
  );
  return () => asyncSuccess(result);
}

export default BundledAssetFilePicker;
