import {
  Accessor,
  Component,
  createComputed,
  createMemo,
  createResource,
  mapArray,
  Match,
  on,
  onCleanup,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { createStore } from "solid-js/store";
import Resizeable from "@corvu/resizable";
import LandingApp from "./LandingApp";
import { NoTrack } from "../util";
import { createFileSystemExplorer } from "./FileSystemExplorer";
import {
  AutomergeVfsFile,
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
  AutomergeVirtualFileSystemState,
} from "solid-fs-automerge";
import { err } from "../kitty-demo/Result";
import { asyncFailed, AsyncResult, asyncSuccess } from "../AsyncResult";
import PixelEditor from "../pixel-editor/PixelEditor";
import { TextureAtlas } from "../level-builder/texture-atlas/TextureAtlas";
import { Level } from "../level-builder/level/Level";
import {
  textureAtlasComponentType,
  TextureAtlasState,
} from "../level-builder/components/TextureAtlasComponent";
import {
  frameComponentType,
  FrameState,
} from "../level-builder/components/FrameComponent";
import { EcsWorldAutomergeProjection } from "../ecs/EcsWorldAutomergeProjection";
import { registry } from "../level-builder/components/registry";
import { opToArr } from "../kitty-demo/util";
import { asyncPending, ok, Result } from "control-flow-as-value";
import { levelComponentType } from "../level-builder/components/LevelComponent";
import { EcsWorld } from "../ecs/EcsWorld";
import {
  IMAGES_FOLDER_NAME,
  LEVELS_FOLDER_NAME,
  SOURCE_FOLDER_NAME,
  TEXTURE_ATLASES_FOLDER_NAME,
} from "../level-builder/LevelBuilder";
import ScriptEditor, {
  mountAutomergeFolderToMonacoVfsWhileMounted,
} from "../script-editor/ScriptEditor";
import Game from "./Game";
import {
  exportToZip,
  importFromZip,
} from "solid-fs-automerge/src/export-import";
import CodeMirror, {
  mountAutomergeFolderToCodeMirrorVfsWhileMounted,
} from "../code-mirror/CodeMirror";
import ExamplesLoader from "./ExamplesLoader";

const AppV2: Component<{
  vfsDocUrl: string;
  vfs: AutomergeVirtualFileSystem;
  ConnectionManagementUi: Component;
  broadcastNetworkAdapterIsEnabled: boolean;
  enableBroadcastNetworkAdapter: () => void;
  flushRepo: () => Promise<void>;
}> = (props) => {
  let [state, setState] = createStore<{
    showGame: boolean;
    useCodeMirror: boolean;
    overlayApp:
      | NoTrack<{
          Title: Component;
          View: Component;
        }>
      | undefined;
  }>({
    showGame: false,
    useCodeMirror: false,
    overlayApp: undefined,
  });
  let fileSystemExplorer = createFileSystemExplorer({
    get vfs() {
      return props.vfs;
    },
  });
  let vfs = createMemo(() => asyncSuccess(props.vfs));
  let selectionCount = () => fileSystemExplorer.selectionCount();
  let contentFolderSelected = createMemo<
    "Images" | "Texture Atlases" | "Levels" | "Source" | undefined
  >(() => {
    if (selectionCount() != 1) {
      return undefined;
    }
    if (fileSystemExplorer.isSelected("images")) {
      return "Images";
    }
    if (fileSystemExplorer.isSelected("texture_atlases")) {
      return "Texture Atlases";
    }
    if (fileSystemExplorer.isSelected("levels")) {
      return "Levels";
    }
    if (fileSystemExplorer.isSelected(SOURCE_FOLDER_NAME)) {
      return "Source";
    }
    return undefined;
  });
  let rootFolder_ = createMemo(() => {
    let vfs2 = vfs();
    if (vfs2.type != "Success") {
      return vfs2;
    }
    let vfs3 = vfs2.value;
    return asyncSuccess(vfs3.rootFolder());
  });
  let rootFolder = createMemo(() => {
    let tmp = rootFolder_();
    if (tmp.type != "Success") {
      return tmp;
    }
    return tmp.value();
  });
  let getOrCreateFolderInRoot = (
    folderName: string,
  ): Accessor<AsyncResult<AutomergeVfsFolder>> => {
    let result_ = createMemo(() => {
      let rootFolder2 = rootFolder();
      if (rootFolder2.type != "Success") {
        return rootFolder2;
      }
      let rootFolder3 = rootFolder2.value;
      let folderId = createMemo(() => {
        // untrack this so we are not being a Hydra
        let folderId2 = untrack(() => rootFolder3.getFolderId(folderName));
        //
        if (folderId2 != undefined) {
          return asyncSuccess(folderId2);
        }
        let folderId3 = rootFolder3.createFolder(folderName);
        if (folderId3.type == "Err") {
          return asyncFailed(folderId3.message);
        }
        return asyncSuccess(folderId3.value.id);
      });
      let result_ = createMemo(() => {
        let folderId2 = folderId();
        if (folderId2.type != "Success") {
          return folderId2;
        }
        let folderId3 = folderId2.value;
        return asyncSuccess(rootFolder3.openFolderById(folderId3));
      });
      return asyncSuccess(
        createMemo(() => {
          let tmp = result_();
          if (tmp.type != "Success") {
            return tmp;
          }
          return tmp.value();
        }),
      );
    });
    return createMemo(() => {
      let tmp = result_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  };
  let imagesFolder = getOrCreateFolderInRoot(IMAGES_FOLDER_NAME);
  let textureAtlasesFolder = getOrCreateFolderInRoot(
    TEXTURE_ATLASES_FOLDER_NAME,
  );
  let levelsFolder = getOrCreateFolderInRoot(LEVELS_FOLDER_NAME);
  let sourceFolder = getOrCreateFolderInRoot(SOURCE_FOLDER_NAME);
  createComputed(
    on(sourceFolder, (sourceFolder) => {
      if (sourceFolder.type != "Success") {
        return;
      }
      let sourceFolder2 = sourceFolder.value;
      mountAutomergeFolderToMonacoVfsWhileMounted(sourceFolder2);
      mountAutomergeFolderToCodeMirrorVfsWhileMounted(sourceFolder2);
    }),
  );
  let selectedImageFileById = createMemo(() => {
    if (selectionCount() != 1) {
      return undefined;
    }
    let imagesFolder2 = imagesFolder();
    if (imagesFolder2.type != "Success") {
      return undefined;
    }
    let imagesFolder3 = imagesFolder2.value;
    let contents = imagesFolder3.contents;
    for (let image of contents) {
      if (image.type != "File") {
        continue;
      }
      if (fileSystemExplorer.isSelected("images/" + image.name)) {
        return image.id;
      }
    }
    return undefined;
  });
  let selectedTextureAtlasFileById = createMemo(() => {
    if (selectionCount() != 1) {
      return undefined;
    }
    let textureAtlasesFolder2 = textureAtlasesFolder();
    if (textureAtlasesFolder2.type != "Success") {
      return undefined;
    }
    let textureAtlasesFolder3 = textureAtlasesFolder2.value;
    let contents = textureAtlasesFolder3.contents;
    for (let textureAtlas of contents) {
      if (textureAtlas.type != "File") {
        continue;
      }
      if (
        fileSystemExplorer.isSelected("texture_atlases/" + textureAtlas.name)
      ) {
        return textureAtlas.id;
      }
    }
    return undefined;
  });
  let selectedLevelFileById = createMemo(() => {
    if (selectionCount() != 1) {
      return undefined;
    }
    let levelsFolder2 = levelsFolder();
    if (levelsFolder2.type != "Success") {
      return undefined;
    }
    let levelsFolder3 = levelsFolder2.value;
    let contents = levelsFolder3.contents;
    for (let level of contents) {
      if (level.type != "File") {
        continue;
      }
      if (fileSystemExplorer.isSelected("levels/" + level.name)) {
        return level.id;
      }
    }
    return undefined;
  });
  let selectedSourceFileRelPath = createMemo(() => {
    if (selectionCount() != 1) {
      return undefined;
    }
    let sourceFolder2 = sourceFolder();
    if (sourceFolder2.type != "Success") {
      return undefined;
    }
    let sourceFolder3 = sourceFolder2.value;
    let contents = sourceFolder3.contents;
    for (let sourceFile of contents) {
      if (sourceFile.type != "File") {
        continue;
      }
      if (
        fileSystemExplorer.isSelected(
          SOURCE_FOLDER_NAME + "/" + sourceFile.name,
        )
      ) {
        return sourceFile.name;
      }
    }
    return undefined;
  });
  let selectedSourceFileById = createMemo(() => {
    if (selectionCount() != 1) {
      return undefined;
    }
    let sourceFolder2 = sourceFolder();
    if (sourceFolder2.type != "Success") {
      return undefined;
    }
    let sourceFolder3 = sourceFolder2.value;
    let contents = sourceFolder3.contents;
    for (let sourceFile of contents) {
      if (sourceFile.type != "File") {
        continue;
      }
      if (
        fileSystemExplorer.isSelected(
          SOURCE_FOLDER_NAME + "/" + sourceFile.name,
        )
      ) {
        return sourceFile.id;
      }
    }
    return undefined;
  });
  const showConnectionManager = () => {
    setState(
      "overlayApp",
      new NoTrack({
        Title: () => <h3 class="text-lg font-bold">Connection Manager</h3>,
        View: () => <props.ConnectionManagementUi />,
      }),
    );
  };
  const newImage = () => {
    // TODO
  };
  const newTextureAtlas = () => {
    // TODO
  };
  const newLevel = () => {
    let levelsFolder2 = levelsFolder();
    if (levelsFolder2.type != "Success") {
      return;
    }
    let levelsFolder3 = levelsFolder2.value;
    let levelFilename = window.prompt("Enter name for level:");
    if (levelFilename == null) {
      return;
    }
    levelFilename = levelFilename.trim();
    if (levelFilename == "") {
      return;
    }
    levelFilename += ".json";
    let level = levelComponentType.create({
      tileToShortIdTable: [],
      mapData: Array(10)
        .fill(undefined)
        .map((_) =>
          Array(10)
            .fill(undefined)
            .map((_) => 0),
        ),
    });
    let world = new EcsWorld();
    world.createEntity([level]);
    let result = levelsFolder3.createFile(levelFilename, world.toJson());
    if (result.type == "Err") {
      return;
    }
    let fileId = result.value.id;
    // TODO: Set selection of file explorer to fileId
  };
  const newSource = () => {
    let sourceFolder2 = sourceFolder();
    if (sourceFolder2.type != "Success") {
      return;
    }
    let sourceFolder3 = sourceFolder2.value;
    let sourceFileName = window.prompt("Enter name of source file:");
    if (sourceFileName == null) {
      return;
    }
    sourceFileName = sourceFileName.trim();
    if (sourceFileName == "") {
      return;
    }
    sourceFileName += ".ts";
    let result = sourceFolder3.createFile(sourceFileName, {
      source: "",
    });
    if (result.type == "Err") {
      return;
    }
    let fileId = result.value.id;
    // TODO: Set selection of file explorer to fileId
  };
  const showFileExplorer = () => {
    setState(
      "overlayApp",
      new NoTrack({
        Title: () => <h3 class="text-lg font-bold">File Explorer</h3>,
        View: () => (
          <div
            style={{
              "flex-grow": "1",
              display: "flex",
              "flex-direction": "column",
            }}
          >
            <div style="margin-bottom: 5px;">
              <button
                class="btn btn-primary"
                disabled={contentFolderSelected() == undefined}
                onClick={() => {
                  let x = contentFolderSelected();
                  if (x == undefined) {
                    return undefined;
                  }
                  switch (x) {
                    case "Images": {
                      newImage();
                      break;
                    }
                    case "Texture Atlases":
                      {
                      }
                      newTextureAtlas();
                      break;
                    case "Levels":
                      newLevel();
                      break;
                    case "Source":
                      newSource();
                      break;
                  }
                }}
              >
                New{" "}
                {(() => {
                  let x = contentFolderSelected();
                  if (x == undefined) {
                    return undefined;
                  }
                  switch (x) {
                    case "Images":
                      return "Image";
                    case "Texture Atlases":
                      return "Texture Atlas";
                    case "Levels":
                      return "Level";
                    case "Source":
                      return "Source";
                  }
                })()}
              </button>
            </div>
            <fileSystemExplorer.Render />
          </div>
        ),
      }),
    );
  };
  const loadExample = () => {
    setState(
      "overlayApp",
      new NoTrack({
        Title: () => "Examples",
        View: () => (
          <ExamplesLoader
            vfs={props.vfs}
            onDone={async () => {
              setState("overlayApp", undefined);
              await props.flushRepo();
              window.location.reload();
            }}
          />
        ),
      })
    );
  };
  let selectedImageFile_ = createMemo(() => {
    let imagesFolder2 = imagesFolder();
    if (imagesFolder2.type != "Success") {
      return undefined;
    }
    let imagesFolder3 = imagesFolder2.value;
    let fileId = selectedImageFileById();
    if (fileId == undefined) {
      return undefined;
    }
    return imagesFolder3.openFileById<{
      mimeType: string;
      data: Uint8Array;
    }>(fileId);
  });
  let selectedImageFile = createMemo(() => {
    let tmp = selectedImageFile_();
    if (tmp == undefined) {
      return undefined;
    }
    let tmp2 = tmp();
    if (tmp2.type != "Success") {
      return undefined;
    }
    return tmp2.value;
  });
  let selectedImage_ = createMemo(() => {
    let file = selectedImageFile();
    if (file == undefined) {
      return undefined;
    }
    let mimeType: string = file.doc.mimeType;
    let data: Uint8Array = file.doc.data;
    let blob = new Blob([data], { type: mimeType });
    let imageUrl = URL.createObjectURL(blob);
    onCleanup(() => {
      URL.revokeObjectURL(imageUrl);
    });
    let [image] = createResource(
      () =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          let image = new Image();
          image.src = imageUrl;
          image.onload = (e) => {
            resolve(image);
          };
          image.onerror = (e) => {
            reject(e);
          };
        }),
    );
    return image;
  });
  let selectedImage = createMemo(() => selectedImage_()?.());
  let imageFiles: Accessor<AsyncResult<AutomergeVfsFile<any>[]>>;
  {
    let imageFiles_ = createMemo(() => {
      let imagesFolder2 = imagesFolder();
      if (imagesFolder2.type != "Success") {
        return imagesFolder2;
      }
      let imageFolder3 = imagesFolder2.value;
      let result_ = createMemo(
        mapArray(
          () => imageFolder3.contents,
          (entry) => {
            return createMemo(() => {
              if (entry.type != "File") {
                return undefined;
              }
              return imageFolder3.openFileById(entry.id);
            });
          },
        ),
      );
      return asyncSuccess(
        createMemo(() => {
          let result: AutomergeVfsFile<any>[] = [];
          let tmp = result_();
          for (let tmp2 of tmp) {
            let tmp3 = tmp2();
            if (tmp3 == undefined) {
              continue;
            }
            let tmp4 = tmp3();
            if (tmp4.type != "Success") {
              return tmp4;
            }
            result.push(tmp4.value);
          }
          return asyncSuccess(result);
        }),
      );
    });
    imageFiles = createMemo(() => {
      let tmp = imageFiles_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  }
  // Keep all tiles available for level creation
  let textureAtlasWithImageAndFramesList: Accessor<
    AsyncResult<
      {
        textureAtlasFilename: Accessor<string>;
        textureAtlas: TextureAtlasState;
        image: HTMLImageElement;
        frames: { frameId: string; frame: FrameState }[];
      }[]
    >
  >;
  {
    let textureAtlasFiles_ = createMemo(() => {
      let textureAtlasesFolder2 = textureAtlasesFolder();
      if (textureAtlasesFolder2.type != "Success") {
        return textureAtlasesFolder2;
      }
      let textureAtlasesFolder3 = textureAtlasesFolder2.value;
      let result_ = createMemo(
        mapArray(
          () => textureAtlasesFolder3.contents,
          (entry) =>
            createMemo(() => {
              if (entry.type != "File") {
                return undefined;
              }
              return textureAtlasesFolder3.openFileById(entry.id);
            }),
        ),
      );
      return asyncSuccess(
        createMemo(() => {
          let result: AutomergeVfsFile<any>[] = [];
          let tmp = result_();
          for (let tmp2 of tmp) {
            let tmp3 = tmp2();
            if (tmp3 == undefined) {
              continue;
            }
            let tmp4 = tmp3();
            if (tmp4.type != "Success") {
              return tmp4;
            }
            result.push(tmp4.value);
          }
          return asyncSuccess(result);
        }),
      );
    });
    let imageFilenameFileMap = createMemo(() => {
      let imageFiles2 = imageFiles();
      if (imageFiles2.type != "Success") {
        return imageFiles2;
      }
      let imageFiles3 = imageFiles2.value;
      let result: Map<string, AutomergeVfsFile<any>> = new Map();
      for (let imageFile of imageFiles3) {
        result.set(imageFile.name(), imageFile);
      }
      return asyncSuccess(result);
    });
    let textureAtlasFiles = createMemo(() => {
      let tmp = textureAtlasFiles_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
    let textureAtlasFilesAsyncType = createMemo(() => textureAtlasFiles().type);
    let textureAtlases_ = createMemo(() => {
      let imageFilenameFileMap2 = imageFilenameFileMap();
      if (imageFilenameFileMap2.type != "Success") {
        return imageFilenameFileMap2;
      }
      let imageFilenameFileMap3 = imageFilenameFileMap2.value;
      if (textureAtlasFilesAsyncType() != "Success") {
        return textureAtlasFiles() as AsyncResult<never>;
      }
      let textureAtlasFiles2 = createMemo(() => {
        let tmp = textureAtlasFiles();
        if (tmp.type != "Success") {
          throw new Error("Unreachable");
        }
        return tmp.value;
      });
      return asyncSuccess(
        createMemo(
          mapArray(textureAtlasFiles2, (textureAtlasFile) => {
            return createMemo(() => {
              let r = EcsWorldAutomergeProjection.create(
                registry,
                textureAtlasFile.docHandle,
              );
              if (r.type == "Err") {
                return asyncFailed(r.message);
              }
              let textureAtlasWorld = r.value;
              return asyncSuccess(
                createMemo(() => {
                  let world = textureAtlasWorld;
                  let entities = world.entitiesWithComponentType(
                    textureAtlasComponentType,
                  );
                  if (entities.length != 1) {
                    return asyncFailed(
                      "Expected expect exactly one texture atlas entity.",
                    );
                  }
                  let entity = entities[0];
                  let textureAtlas = world.getComponent(
                    entity,
                    textureAtlasComponentType,
                  )?.state;
                  if (textureAtlas == undefined) {
                    return asyncFailed(
                      "Texture atlas not found in texture atlas file.",
                    );
                  }
                  let frameEntities =
                    world.entitiesWithComponentType(frameComponentType);
                  let frames = frameEntities.flatMap((frameEntity) =>
                    opToArr(
                      world.getComponent(frameEntity, frameComponentType)
                        ?.state,
                    ).map((frame) => ({
                      frameId: frameEntity,
                      frame,
                    })),
                  );
                  let textureAtlas2 = textureAtlas;
                  let imageFilename = textureAtlas2.imageRef;
                  let imageFile = imageFilenameFileMap3.get(imageFilename);
                  if (imageFile == undefined) {
                    return asyncFailed(
                      "Texture atlas referenced image not found.",
                    );
                  }
                  return asyncSuccess(
                    createMemo(() => {
                      let blob = new Blob([imageFile.doc.data], {
                        type: imageFile.doc.mimeType,
                      });
                      let imageUrl = URL.createObjectURL(blob);
                      onCleanup(() => URL.revokeObjectURL(imageUrl));
                      let [image] = createResource(
                        () =>
                          new Promise<Result<HTMLImageElement>>((resolve) => {
                            let image2 = new Image();
                            image2.src = imageUrl;
                            image2.onerror = () => {
                              resolve(err("Failed to load image."));
                            };
                            image2.onload = () => {
                              resolve(ok(image2));
                            };
                          }),
                      );
                      return asyncSuccess(
                        createMemo(() => {
                          let image2 = image();
                          if (image2 == undefined) {
                            return asyncPending();
                          }
                          if (image2.type == "Err") {
                            return asyncFailed(image2.message);
                          }
                          let image3 = image2.value;
                          return asyncSuccess({
                            textureAtlasFilename: textureAtlasFile.name,
                            textureAtlas: textureAtlas2,
                            image: image3,
                            frames,
                          });
                        }),
                      );
                    }),
                  );
                }),
              );
            });
          }),
        ),
      );
    });
    textureAtlasWithImageAndFramesList = createMemo(() => {
      let result: {
        textureAtlasFilename: Accessor<string>;
        textureAtlas: TextureAtlasState;
        image: HTMLImageElement;
        frames: { frameId: string; frame: FrameState }[];
      }[] = [];
      let tmp = textureAtlases_();
      if (tmp.type != "Success") {
        return tmp;
      }
      let tmp2 = tmp.value();
      for (let tmp3 of tmp2) {
        let tmp4 = tmp3();
        if (tmp4.type != "Success") {
          return tmp4;
        }
        let tmp5 = tmp4.value();
        if (tmp5.type != "Success") {
          return tmp5;
        }
        let tmp6 = tmp5.value();
        if (tmp6.type != "Success") {
          return tmp6;
        }
        let tmp7 = tmp6.value();
        if (tmp7.type != "Success") {
          return tmp7;
        }
        let tmp8 = tmp7.value;
        result.push(tmp8);
      }
      return asyncSuccess(result);
    });
  }
  let subApp = createMemo(() => {
    let selectedImage2 = selectedImage();
    if (selectedImage2 != undefined) {
      return () => <PixelEditor initImage={selectedImage2} />;
    }
    let selectedTextureAtlasFileById2 = selectedTextureAtlasFileById();
    if (selectedTextureAtlasFileById2 != undefined) {
      let vfs2 = vfs();
      if (vfs2.type != "Success") {
        if (state.showGame) {
          return () => undefined;
        }
        return LandingApp;
      }
      let vfs3 = vfs2.value;
      let textureAtlas = new TextureAtlas({
        vfs: vfs3,
        imagesFolder,
        textureAtlasesFolder,
        textureAtlasFileId: () => selectedTextureAtlasFileById2,
      });
      return () => (
        <textureAtlas.Render
          style={{
            "flex-grow": "1",
          }}
        />
      );
    }
    let selectedLevelFileById2 = selectedLevelFileById();
    if (selectedLevelFileById2 != undefined) {
      let vfs2 = vfs();
      if (vfs2.type != "Success") {
        if (state.showGame) {
          return () => undefined;
        }
        return LandingApp;
      }
      let vfs3 = vfs2.value;
      let level = new Level({
        vfs: vfs3,
        imagesFolder,
        textureAtlasesFolder,
        levelFileId: () => selectedLevelFileById2,
        textureAtlasWithImageAndFramesList,
      });
      return () => (
        <level.Render
          style={{
            "flex-grow": "1",
          }}
        />
      );
    }
    let selectedSourceFileRelPath2 = selectedSourceFileRelPath();
    if (selectedSourceFileRelPath2 != undefined) {
      let sourceFolder2 = sourceFolder();
      if (sourceFolder2.type != "Success") {
        if (state.showGame) {
          return () => undefined;
        }
        return LandingApp;
      }
      let sourceFolder3 = sourceFolder2.value;
      return () => (
        <Switch>
          <Match when={state.useCodeMirror}>
            <CodeMirror path={selectedSourceFileRelPath2} />
          </Match>
          <Match when={!state.useCodeMirror}>
            <ScriptEditor path={selectedSourceFileRelPath2} />
          </Match>
        </Switch>
      );
    }
    if (state.showGame) {
      return () => undefined;
    }
    return LandingApp;
  });
  let SubApp: Component = () => <>{subApp()({})}</>;
  return (
    <div
      style={{
        "flex-grow": "1",
        overflow: "hidden",
        display: "flex",
        "flex-direction": "column",
        position: "relative",
      }}
    >
      {selectedImageFileById()}
      <ul class="menu menu-horizontal bg-base-200 rounded-box">
        <li onClick={() => showConnectionManager()}>
          <i class="fa-solid fa-network-wired" />
        </li>
        <li onClick={() => showFileExplorer()}>
          <i class="fa-solid fa-folder-tree" />
        </li>
        <li>
          <label>
            <input
              type="checkbox"
              class="checkbox checkbox-xs"
              checked={state.showGame}
              style="display: inline-block;"
              onChange={(e) => {
                setState("showGame", e.currentTarget.checked);
              }}
            />
            Show Game
          </label>
        </li>
        <li>
          <select
            class="select select-xs"
            value={state.useCodeMirror ? "codemirror" : "monaco"}
            onChange={(e) => {
              setState("useCodeMirror", e.currentTarget.value == "codemirror");
            }}
          >
            <option value="monaco">Monaco</option>
            <option value="codemirror">Code Mirror</option>
          </select>
        </li>
        <li>
          <button
            class="btn btn-xs btn-primary"
            onClick={() => loadExample()}
          >
            Load Example...
          </button>
        </li>
        <Show when={!props.broadcastNetworkAdapterIsEnabled}>
          <li>
            <button
              class="btn btn-xs btn-secondary"
              onClick={() => {
                props.enableBroadcastNetworkAdapter();
              }}
            >
              Enable BNA
            </button>
          </li>
        </Show>
        <li onClick={() => exportToZip({ vfs: props.vfs })}>
          <i class="fa-solid fa-download" />
        </li>
        {untrack(() => {
          let fileInputElement!: HTMLInputElement;
          return (
            <li
              onClick={() => {
                fileInputElement.click();
              }}
            >
              <i class="fa-solid fa-upload" />
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
                  (async () => {
                    await importFromZip({ file: files[0], vfs: props.vfs });
                    await props.flushRepo();
                    window.location.reload();
                  })();
                }}
              />
            </li>
          );
        })}
      </ul>
      <div
        style={{
          "flex-grow": "1",
          display: "flex",
          "flex-direction": "row",
          overflow: "hidden",
        }}
      >
        <Switch>
          <Match when={!state.showGame}>
            <SubApp />
          </Match>
          <Match when={state.showGame && subApp()({}) == undefined}>
            <Game vfsDocUrl={props.vfsDocUrl} vfs={props.vfs} />
          </Match>
          <Match when={state.showGame && subApp()({}) != undefined}>
            <Resizeable
              orientation="horizontal"
              style={{
                "flex-grow": "1",
                overflow: "hidden",
              }}
            >
              <Resizeable.Panel
                style={{
                  display: "flex",
                  overflow: "hidden",
                }}
              >
                <SubApp />
              </Resizeable.Panel>
              <Resizeable.Handle
                aria-label="Resize Handle"
                class="group basis-3 px-0.75"
              >
                <div class="size-full rounded-sm transition-colors group-data-active:bg-corvu-300 group-data-dragging:bg-corvu-100" />
              </Resizeable.Handle>
              <Resizeable.Panel
                style={{
                  display: "flex",
                  overflow: "hidden",
                }}
              >
                <Game vfsDocUrl={props.vfsDocUrl} vfs={props.vfs} />
              </Resizeable.Panel>
            </Resizeable>
          </Match>
        </Switch>
      </div>
      <Show when={state.overlayApp?.value} keyed={true}>
        {(overlayApp) => (
          <div
            style={{
              position: "absolute",
              left: "0",
              top: "0",
              bottom: "0",
              right: "0",
              display: "flex",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                "flex-grow": "1",
                margin: "5%",
                display: "flex",
                "flex-direction": "column",
                overflow: "hidden",
              }}
              class="bg-base-200 rounded-box"
            >
              <div
                style={{
                  display: "flex",
                  "flex-direction": "row",
                  padding: "10px",
                }}
                class="bg-base-300 rounded-box"
              >
                <div
                  style={{
                    "flex-grow": "1",
                    display: "flex",
                    "flex-direction": "row",
                    "align-items": "center",
                    overflow: "hidden",
                  }}
                >
                  <overlayApp.Title />
                </div>
                <button
                  class="btn btn-primary"
                  onClick={() => setState("overlayApp", undefined)}
                >
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div
                style={{
                  "flex-grow": "1",
                  display: "flex",
                  padding: "10px",
                  overflow: "hidden",
                }}
              >
                <overlayApp.View />
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
};

export default AppV2;
