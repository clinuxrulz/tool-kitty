import {
  Accessor,
  Component,
  createMemo,
  createResource,
  mapArray,
  Match,
  onCleanup,
  Switch,
} from "solid-js";
import { Vec2 } from "../math/Vec2";
import { createStore } from "solid-js/store";
import { TextureAtlases } from "./TextureAtlases";
import { EcsWorld } from "../ecs/EcsWorld";
import { VfsFileOrFolder, VirtualFileSystem } from "./VirtualFileSystem";
import {
  asyncFailed,
  asyncPending,
  AsyncResult,
  asyncSuccess,
} from "../AsyncResult";
import { Levels } from "./Levels";
import { registry } from "./components/registry";
import {
  textureAtlasComponentType,
  TextureAtlasState,
} from "./components/TextureAtlasComponent";
import { err, ok, Result } from "../kitty-demo/Result";
import { frameComponentType, FrameState } from "./components/FrameComponent";
import { opToArr } from "../kitty-demo/util";
import { ReactiveVirtualFileSystem } from "../ReactiveVirtualFileSystem";
import {
  AutomergeVfsFile,
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
  VfsFile,
  VfsFolderContents,
} from "solid-fs-automerge";
import { makeDocumentProjection } from "solid-automerge";
import { Doc } from "@automerge/automerge-repo";
import { base64ToUint8Array } from "../util";
import { EcsWorldAutomergeProjection } from "../ecs/EcsWorldAutomergeProjection";

type State = {
  selectedTab: "Texture Atlases" | "Levels";
};

export const IMAGES_FOLDER_NAME = "images";
export const TEXTURE_ATLASES_FOLDER_NAME = "texture_atlases";
export const LEVELS_FOLDER_NAME = "levels";
export const SOURCE_FOLDER_NAME = "src";

const LevelBuilder: Component<{
  vfs: AutomergeVirtualFileSystem;
}> = (props) => {
  let [state, setState] = createStore<State>({
    selectedTab: "Texture Atlases",
  });
  let rootFolderFilesAndFolders: Accessor<AsyncResult<Doc<VfsFolderContents>>>;
  {
    let rootFolderFilesAndFolders_ = createMemo(() => {
      let rootFolderId = props.vfs.rootFolderId();
      if (rootFolderId.type != "Success") {
        return rootFolderId;
      }
      let rootFolderId2 = rootFolderId.value;
      let folderContents = props.vfs.readFolder(rootFolderId2);
      return asyncSuccess(
        createMemo(() => {
          let folderContents2 = folderContents();
          if (folderContents2.type != "Success") {
            return folderContents2;
          }
          let folderContents3 = folderContents2.value;
          return asyncSuccess(makeDocumentProjection(folderContents3));
        }),
      );
    });
    rootFolderFilesAndFolders = createMemo(() => {
      let tmp = rootFolderFilesAndFolders_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  }
  let imagesFolder: Accessor<AsyncResult<AutomergeVfsFolder>> =
    createGetOrCreateRootFolder({
      vfs: props.vfs,
      folderName: IMAGES_FOLDER_NAME,
    });
  let textureAtlasesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
  {
    let textureAtlasesFolder_ = createMemo(() => {
      // Wait for image folder to be created first
      let imagesFolderId2 = imagesFolder();
      if (imagesFolderId2.type != "Success") {
        return imagesFolderId2;
      }
      //
      return asyncSuccess(
        createGetOrCreateRootFolder({
          vfs: props.vfs,
          folderName: TEXTURE_ATLASES_FOLDER_NAME,
        }),
      );
    });
    textureAtlasesFolder = createMemo(() => {
      let tmp = textureAtlasesFolder_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  }
  let levelsFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
  {
    let levelsFolder_ = createMemo(() => {
      // Wait for image folder and texture atlas folder to be created first
      let imagesFolderId2 = imagesFolder();
      if (imagesFolderId2.type != "Success") {
        return imagesFolderId2;
      }
      let textureAtlasesFolderId2 = textureAtlasesFolder();
      if (textureAtlasesFolderId2.type != "Success") {
        return textureAtlasesFolderId2;
      }
      //
      return asyncSuccess(
        createGetOrCreateRootFolder({
          vfs: props.vfs,
          folderName: LEVELS_FOLDER_NAME,
        }),
      );
    });
    levelsFolder = createMemo(() => {
      let tmp = levelsFolder_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  }
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
  let textureAtlases = new TextureAtlases({
    vfs: props.vfs,
    imagesFolder,
    imageFiles,
    textureAtlasesFolder,
  });
  onCleanup(() => {
    textureAtlases.dispose();
  });
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
  //
  let levels = new Levels({
    vfs: props.vfs,
    imagesFolder,
    textureAtlasesFolder,
    levelsFolder,
    textureAtlasWithImageAndFramesList,
  });
  return (
    <div
      style={{
        "flex-grow": "1",
        display: "flex",
        "flex-direction": "column",
        overflow: "hidden",
      }}
    >
      <div role="tablist" class="tabs tabs-box">
        <a
          role="tab"
          classList={{
            tab: true,
            "tab-active": state.selectedTab == "Texture Atlases",
          }}
          onClick={() => setState("selectedTab", "Texture Atlases")}
        >
          Texture Atlases
        </a>
        <a
          role="tab"
          classList={{
            tab: true,
            "tab-active": state.selectedTab == "Levels",
          }}
          onClick={() => setState("selectedTab", "Levels")}
        >
          Levels
        </a>
      </div>
      <Switch>
        <Match when={state.selectedTab == "Texture Atlases"}>
          <textureAtlases.Render
            style={{
              "flex-grow": "1",
            }}
          />
        </Match>
        <Match when={state.selectedTab == "Levels"}>
          <levels.Render
            style={{
              "flex-grow": "1",
            }}
          />
        </Match>
      </Switch>
    </div>
  );
};

function createGetOrCreateRootFolder(params: {
  vfs: AutomergeVirtualFileSystem;
  folderName: string;
}): Accessor<AsyncResult<AutomergeVfsFolder>> {
  let rootFolder = params.vfs.rootFolder();
  let rootFilesAndFolders: Accessor<
    AsyncResult<
      {
        id: string;
        type: "File" | "Folder";
        name: string;
      }[]
    >
  >;
  {
    let rootFilesAndFolders_ = createMemo(() => {
      let rootFolder2 = rootFolder();
      if (rootFolder2.type != "Success") {
        return rootFolder2;
      }
      let rootFolder3 = rootFolder2.value;
      return asyncSuccess(rootFolder3.contents);
    });
    rootFilesAndFolders = createMemo(() => {
      let tmp = rootFilesAndFolders_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return asyncSuccess(tmp.value);
    });
  }
  let folder: Accessor<AsyncResult<AutomergeVfsFolder>>;
  {
    let folder_ = createMemo(() => {
      let rootFolder2 = rootFolder();
      if (rootFolder2.type != "Success") {
        return rootFolder2;
      }
      let rootFolder3 = rootFolder2.value;
      let rootFilesAndFolders2 = rootFilesAndFolders();
      if (rootFilesAndFolders2.type != "Success") {
        return rootFilesAndFolders2;
      }
      let rootFilesAndFolders3 = rootFilesAndFolders2.value;
      let result = rootFilesAndFolders3.find(
        (entry) => entry.name == params.folderName,
      );
      if (result != undefined) {
        return asyncSuccess(rootFolder3.openFolderById(result.id));
      }
      let [result2] = createResource(async () =>
        rootFolder3.createFolder(params.folderName),
      );
      let result_ = createMemo(() => {
        let result3 = result2();
        if (result3 == undefined) {
          return asyncPending();
        }
        if (result3.type == "Err") {
          return asyncFailed(result3.message);
        }
        let id = result3.value.id;
        return asyncSuccess(rootFolder3.openFolderById(id));
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
    folder = createMemo(() => {
      let tmp = folder_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  }
  return folder;
}

export default LevelBuilder;
