import JSZip, { file } from "jszip";
import { ReactiveSet } from "@solid-primitives/set";
import { asyncFailed, asyncPending, AsyncResult, asyncSuccess, Result } from "control-flow-as-value";
import { Accessor, Component, createEffect, createMemo, createSignal, For, mapArray, Match, onMount, Show, Switch } from "solid-js";
import { createSign } from "crypto";

const bundledAssets = import.meta.glob(
  "../../bundled_assets/*.zip",
  {
    query: "?url",
    eager: true,
  }
) as Record<string,{ default: string, }>;
let bundledAssets2: Record<string,string> = {};
{
  let pathSkipSize = "../../bundled_assets/".length;
  for (let [ path, url ] of Object.entries(bundledAssets)) {
    let url2 = url.default;
    let path2 = path.slice(pathSkipSize);
    bundledAssets2[path2] = url2;
  }
}

type TreeNode = {
  type: "Folder",
  name: string,
  children: () => Accessor<AsyncResult<TreeNode[]>>,
} | {
  type: "File",
  name: string,
};

const BundledAssetFilePicker: Component<{}> = (props) => {
  let tree: Accessor<TreeNode[]>;
  {
    let tree_ = Object.entries(bundledAssets2)
      .map(
        ([ filename, url ]) =>
          bundledZipToTreeNode({ filename, url, })
      );
    tree = () => tree_;
  }
  let expandedSet = new ReactiveSet();
  // test
  for (let node of tree()) {
    if (node.type == "Folder") {
      let children = node.children();
      createEffect(() => console.log(children()));
    }
  }
  //
  let { Render: RenderTree } = createRenderTree({
    get tree() {
      return tree();
    },
  });
  //
  return (<RenderTree/>);
};

function createRenderTree(props: {
  tree: TreeNode[],
}): {
  firstRowHeight: Accessor<number | undefined>,
  height: Accessor<number | undefined>,
  Render: Component,
} {
  let rowsWithHeights = createMemo(mapArray(
    () => props.tree,
    (treeNode) => {
      switch (treeNode.type) {
        case "Folder": {
          return createRenderFolder({
            folder: treeNode,
          });
        }
        case "File": {
          let tmp = createRenderFile({
            file: treeNode,
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
    let total = -0.5 * firstRowHeight2 + 0.5 * lastRowFirstRowHeight2;
    for (let i = 0; i < rowsWithHeights2.length-1; ++i) {
      let height = rowsWithHeights2[i].height();
      if (height == undefined) {
        continue;
      }
      total += height;
    }
    return total;
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
        continue;
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
    Render: () => (
      <div
        style={{
          display: "flex",
          "flex-direction": "row",
        }}
      >
        <Show when={vline()}>
          {(vline) => (
            <div
              style={{
                "margin-top": `${vline().offsetY}px`,
                "margin-right": "5px",
                height: `${vline().height}px`,
                width: "2px",
                "background-color": "green",
              }}
            />
          )}
        </Show>
        <div>
          <For each={rowsWithHeights()}>
            {(row) => (<row.Render/>)}
          </For>
        </div>
      </div>
    )
  };
}

function createRenderFolder(props: {
  folder: Extract<TreeNode, { type: "Folder", }>,
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
    });
  });
  let [ firstRowHeight, setFirstRowHeight, ] = createSignal<number>();
  let rowDiv!: HTMLDivElement;
  onMount(() => {
    let rect = rowDiv.getBoundingClientRect();
    setFirstRowHeight(rect.height);
  });
  let height = createMemo(() => {
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
  return {
    firstRowHeight,
    height,
    Render: () => {
      return (
        <div>
          <div ref={rowDiv}>{props.folder.name}</div>
          <div
            style="padding-left: 10px;"
          >
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
        </div>
      );
    },
  };
}

function createRenderFile(props: {
  file: Extract<TreeNode, { type: "File", }>,
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
      return (<div ref={rowDiv}>{props.file.name}</div>);
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
