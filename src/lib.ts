import {
  Accessor,
  createComputed,
  createMemo,
  createResource,
  createRoot,
  createSignal,
  mapArray,
  on,
  onCleanup,
} from "solid-js";
import { EcsWorld } from "./lib";
import { makeRefCountedMakeReactiveObject } from "./util";
import {
  AutomergeVfsFile,
  AutomergeVfsFolder,
  AutomergeVirtualFileSystem,
  AutomergeVirtualFileSystemState,
} from "solid-fs-automerge";
import { isValidAutomergeUrl, Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { BroadcastChannelNetworkAdapter } from "@automerge/automerge-repo-network-broadcastchannel";
import {
  asyncFailed,
  asyncPending,
  AsyncResult,
  asyncSuccess,
  err,
  ok,
  Result,
} from "control-flow-as-value";
import {
  textureAtlasComponentType,
  TextureAtlasState,
} from "./level-builder/components/TextureAtlasComponent";
import {
  frameComponentType,
  FrameState,
} from "./level-builder/components/FrameComponent";
import {
  IMAGES_FOLDER_NAME,
  LEVELS_FOLDER_NAME,
  TEXTURE_ATLASES_FOLDER_NAME,
} from "./level-builder/LevelBuilder";
import { EcsWorldAutomergeProjection } from "./ecs/EcsWorldAutomergeProjection";
import { opToArr } from "./kitty-demo/util";
import { registry } from "./components/registry";
import {
  PixiRenderSystem,
  PixiRenderSystem as X,
} from "./systems/PixiRenderSystem";
import { CollisionSystem } from "./systems/CollisionSystem";
import { animationComponentType, AnimationState } from "./level-builder/components/AnimationComponent";
import { AnimationSystem } from "./systems/AnimationSystem";

export * from "./ecs/EcsComponent";
export * from "./ecs/EcsRegistry";
export * from "./ecs/EcsWorld";
export * from "./ecs/components/ChildrenComponent";
export * from "./ecs/components/ParentComponent";
export * from "./ecs/components/SortOrderIndexComponent";
export * from "./TypeSchema";
export { PixiRenderSystem } from "./systems/PixiRenderSystem";
export { createGmeSystem } from "./systems/GmeSystem";
export { createMonsterLogicSystem } from "./systems/MonsterLogicSystem";
export { createSpawnSystem } from "./systems/SpawnSystem";
export { createVirtualDPadSystem } from "./systems/VirtualDPadSystem";
export { CollisionResolutionSystem, createCollisionResolutionSystem } from "./systems/CollisionResolutionSystem";
export * from "solid-js";
export * from "./Cont";
export * from "./cont-do";
export * from "./coroutine-dsl";

let systems = {
  PixiRenderSystem: (params: { world: EcsWorld }) => {
    let system = new PixiRenderSystem(params);
    createComputed(
      on(system.pixiApp, (pixiApp) => {
        if (pixiApp == undefined) {
          return;
        }
        document.body.innerText = "";
        document.body.appendChild(pixiApp.canvas);
        onCleanup(() => {
          document.body.removeChild(pixiApp.canvas);
        });
      }),
    );
  },
  CollisionSystem: (params: { world: EcsWorld }) => {
    let _ = new CollisionSystem(params);
  },
  AnimationSystem: (params: { world: EcsWorld, }) => {
    let _ = new AnimationSystem(params);
  },
};

export type SystemName = keyof typeof systems;

export function useSystem(systemName: SystemName): () => void {
  return createRoot((dispose) => {
    systems[systemName]({ world });
    return dispose;
  });
}

export const REQUIRED_FOR_KEEPING_MANUAL_CHUNKS = () => undefined;

export function launch() {
  import("./index");
}

let [docUrl, setDocUrl] = createSignal<string>(
  window.localStorage.getItem("lastDocUrl") ?? "",
);

window.addEventListener("message", (e) => {
  let data = e.data;
  if (typeof data.type !== "string") {
    return;
  }
  switch (data.type) {
    case "SetDocUrl": {
      let docUrl2 = data?.params?.docUrl;
      if (typeof docUrl2 !== "string") {
        return;
      }
      setDocUrl(docUrl2);
      return;
    }
    default:
      return;
  }
});

let repo = new Repo({
  storage: new IndexedDBStorageAdapter(),
  network: [new BroadcastChannelNetworkAdapter()],
});

export const createAutomergeVfs = makeRefCountedMakeReactiveObject(() => {
  let doc_ = createMemo(() => {
    let docUrl2 = docUrl();
    if (docUrl2 == undefined) {
      return asyncPending();
    }
    let docUrl3 = docUrl2;
    if (!isValidAutomergeUrl(docUrl3)) {
      return asyncFailed("Not a valid automerge url");
    }
    let [doc] = createResource(() => {
      return repo.find<AutomergeVirtualFileSystemState>(docUrl3);
    });
    return asyncSuccess(doc as Accessor<ReturnType<typeof doc>>);
  });
  let doc = createMemo(() => {
    let tmp = doc_();
    if (tmp.type != "Success") {
      return tmp;
    }
    let tmp2 = tmp.value();
    if (tmp2 == undefined) {
      return asyncPending();
    }
    return asyncSuccess(tmp2);
  });
  let vfs = createMemo(() => {
    let doc2 = doc();
    if (doc2.type != "Success") {
      return doc2;
    }
    let doc3 = doc2.value;
    return asyncSuccess(
      new AutomergeVirtualFileSystem({
        repo,
        docHandle: () => doc3,
      }),
    );
  });
  return vfs;
});

export const libUrl = import.meta.url;

export const world = new EcsWorld();

export {
  type AnimatedState,
  animatedComponentType,
} from "./components/AnimatedComponent";
export {
  type CameraState,
  cameraComponentType,
} from "./components/CameraComponent";
export {
  type FlipXState,
  flipXComponentType,
} from "./components/FlipXComponent";
export {
  type LevelRefState,
  levelRefComponentType,
} from "./components/LevelRefComponent";
export {
  type OnGroundState,
  onGroundComponentType,
} from "./components/OnGroundComponent";
export {
  type ScaleState,
  scaleComponentType,
} from "./components/ScaleComponent";
export {
  type SpriteState,
  spriteComponentType,
} from "./components/SpriteComponent";
export {
  type TileCollisionState,
  tileCollisionComponentType,
} from "./components/TileCollisionComponent";
export {
  type Transform2DState,
  transform2DComponentType,
} from "./components/Transform2DComponent";
export {
  type Velocity2DState,
  velocity2DComponentType,
} from "./components/Velocity2DComponent";
export { registry } from "./components/registry";

export { Complex } from "./math/Complex";
export { Transform2D } from "./math/Transform2D";
export { Vec2 } from "./math/Vec2";

function getBlobOrigin(blobUrl: string): string | null {
  const blobRegex = /^(blob:)([a-f0-9-]+-){4}[a-f0-9-]+$/i;
  const match = blobUrl.match(blobRegex);

  if (match) {
    // The origin is everything before the first hyphen after "blob:"
    const firstHyphenIndex = blobUrl.indexOf("-");
    if (firstHyphenIndex > -1 && firstHyphenIndex > "blob:".length) {
      return blobUrl.substring(0, firstHyphenIndex);
    }
  }
  return null; // Not a valid Blob URL
}

export function fixRelativeUrl(relativeUrl: string): string {
  let tmp = import.meta.url;
  if (tmp.startsWith("blob:")) {
    let tmp2 = getBlobOrigin(tmp);
    if (tmp2 != undefined) {
      if (!tmp2.endsWith("/")) {
        tmp2 += "/";
      }
      return tmp2 + relativeUrl;
    }
  }
  if (tmp.includes("/src/")) {
    tmp = tmp.slice(0, tmp.indexOf("/src"));
    let url = tmp + "/" + relativeUrl;
    return url;
  }
  return relativeUrl;
}

export const createGetRootFolder = makeRefCountedMakeReactiveObject(() => {
  let vfs = createAutomergeVfs();
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
  return rootFolder;
});

export const createGetLevelsFolder = makeRefCountedMakeReactiveObject(() => {
  let rootFolder = createGetRootFolder();
  let result_ = createMemo(() => {
    let rootFolder2 = rootFolder();
    if (rootFolder2.type != "Success") {
      return rootFolder2;
    }
    let rootFolder3 = rootFolder2.value;
    let folderId: string | undefined = undefined;
    for (let entry of rootFolder3.contents) {
      if (entry.name == LEVELS_FOLDER_NAME && entry.type == "Folder") {
        folderId = entry.id;
      }
    }
    if (folderId == undefined) {
      return asyncFailed("Levels folder not found");
    }
    return asyncSuccess(rootFolder3.openFolderById(folderId));
  });
  return createMemo(() => {
    let tmp = result_();
    if (tmp.type != "Success") {
      return tmp;
    }
    return tmp.value();
  });
});

export const createTextureAtlasWithImageAndFramesList =
  makeRefCountedMakeReactiveObject(() => {
    let vfs = createAutomergeVfs();
    let result_ = createMemo(() => {
      let vfs2 = vfs();
      if (vfs2.type != "Success") {
        return vfs2;
      }
      let vfs3 = vfs2.value;
      let rootFolder = vfs3.rootFolder();
      let imagesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
      {
        let imagesFolder_ = createMemo(() => {
          let rootFolder2 = rootFolder();
          if (rootFolder2.type != "Success") {
            return rootFolder2;
          }
          let rootFolder3 = rootFolder2.value;
          for (let entry of rootFolder3.contents) {
            if (entry.name == IMAGES_FOLDER_NAME) {
              return asyncSuccess(rootFolder3.openFolderById(entry.id));
            }
          }
          return asyncFailed("Images folder not found");
        });
        imagesFolder = createMemo(() => {
          let tmp = imagesFolder_();
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
      let textureAtlasesFolder: Accessor<AsyncResult<AutomergeVfsFolder>>;
      {
        let textureAtlasesFolder_ = createMemo(() => {
          let rootFolder2 = rootFolder();
          if (rootFolder2.type != "Success") {
            return rootFolder2;
          }
          let rootFolder3 = rootFolder2.value;
          for (let entry of rootFolder3.contents) {
            if (entry.name == TEXTURE_ATLASES_FOLDER_NAME) {
              return asyncSuccess(rootFolder3.openFolderById(entry.id));
            }
          }
          return asyncFailed("Texture atlas folder not found");
        });
        textureAtlasesFolder = createMemo(() => {
          let tmp = textureAtlasesFolder_();
          if (tmp.type != "Success") {
            return tmp;
          }
          return tmp.value();
        });
      }
      let textureAtlasWithImageAndFramesList: Accessor<
        AsyncResult<
          {
            textureAtlasFilename: Accessor<string>;
            textureAtlas: TextureAtlasState;
            image: HTMLImageElement;
            frames: { frameId: string; frame: FrameState }[];
            animations: { animationId: string, animation: AnimationState, }[];
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
        let textureAtlasFilesAsyncType = createMemo(
          () => textureAtlasFiles().type,
        );
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
                      let animationEntities = world.entitiesWithComponentType(animationComponentType);
                      let animations = animationEntities.flatMap((animationEntity) =>
                        opToArr(
                          world.getComponent(animationEntity, animationComponentType)?.state
                        ).map((animation) => ({
                          animationId: animationEntity,
                          animation,
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
                              new Promise<Result<HTMLImageElement>>(
                                (resolve) => {
                                  let image2 = new Image();
                                  image2.src = imageUrl;
                                  image2.onerror = () => {
                                    resolve(err("Failed to load image."));
                                  };
                                  image2.onload = () => {
                                    resolve(ok(image2));
                                  };
                                },
                              ),
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
                                animations,
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
            animations: { animationId: string, animation: AnimationState, }[];
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
      return asyncSuccess(textureAtlasWithImageAndFramesList);
    });
    return createMemo(() => {
      let tmp = result_();
      if (tmp.type != "Success") {
        return tmp;
      }
      return tmp.value();
    });
  });
