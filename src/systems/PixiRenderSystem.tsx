import {
  Application,
  Assets,
  Container,
  ContainerChild,
  Dict,
  Renderer,
  Sprite,
  Spritesheet,
  SpritesheetFrameData,
  Texture,
  TextureStyle,
} from "pixi.js";
import * as PIXI from "pixi.js";
import {
  Accessor,
  batch,
  createComputed,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  mapArray,
  on,
  onCleanup,
  Resource,
} from "solid-js";
import { Level, level1 } from "../kitty-demo/Level";
import { tilesetAtlasData } from "../kitty-demo/tileset";
import { EcsWorld } from "../ecs/EcsWorld";
import {
  levelComponentType,
  LevelState,
} from "../level-builder/components/LevelComponent";
import { createStore } from "solid-js/store";
import { smSpriteAtlasData } from "../kitty-demo/SmSprites";
import { mmSpriteAtlasData } from "../kitty-demo/MmSprites";
import { atlasData } from "../kitty-demo/KittySprites";
import { Transform2D } from "../math/Transform2D";
import { Text } from "pixi.js";
import {
  cameraComponentType,
  Complex,
  createGetLevelsFolder,
  createTextureAtlasWithImageAndFramesList,
  levelRefComponentType,
  spriteComponentType,
  transform2DComponentType,
  Vec2,
} from "../lib";
import { EcsWorldAutomergeProjection } from "../ecs/EcsWorldAutomergeProjection";
import { registry } from "../level-builder/components/registry";
import { TextureAtlasState } from "../level-builder/components/TextureAtlasComponent";
import { FrameState } from "../level-builder/components/FrameComponent";
import { AsyncResult } from "control-flow-as-value";
import { ReactiveCache } from "reactive-cache";
import { scaleComponentType } from "../components/ScaleComponent";
import { Cont } from "../Cont";
import { AutomergeVfsFile, AutomergeVfsFolder } from "solid-fs-automerge";
import { childrenComponentType } from "../ecs/components/ChildrenComponent";
import { tileCollisionComponentType } from "../components/TileCollisionComponent";
import { flipXComponentType } from "../components/FlipXComponent";

TextureStyle.defaultOptions.scaleMode = "nearest";

await Promise.all([
  //Assets.load(tilesetAtlasData.meta.image),
  //Assets.load(atlasData.meta.image),
  //Assets.load(smSpriteAtlasData.meta.image),
  //Assets.load(mmSpriteAtlasData.meta.image),
]);

/*
// Create the SpriteSheet from data and image
const spritesheet = new Spritesheet(
    Texture.from(atlasData.meta.image),
    atlasData,
);

// Generate all the Textures asynchronously
await spritesheet.parse();

const smSpritesheet = new Spritesheet(
    Texture.from(smSpriteAtlasData.meta.image),
    smSpriteAtlasData,
);

await smSpritesheet.parse();

const mmSpritesheet = new Spritesheet(
    Texture.from(mmSpriteAtlasData.meta.image),
    mmSpriteAtlasData,
);

await mmSpritesheet.parse();
*/

/*
const tileset = new Spritesheet(
    Texture.from(tilesetAtlasData.meta.image),
    tilesetAtlasData,
);

await tileset.parse();
*/

export class PixiRenderSystem {
  pixiApp: Accessor<Application<Renderer> | undefined>;

  constructor(params: { world: EcsWorld }) {
    let textureAtlasWithImageAndFramesList =
      createTextureAtlasWithImageAndFramesList();
    let frameIdToFrameMap = createMemo(() => {
      let textureAtlasWithImageAndFramesList2 =
        textureAtlasWithImageAndFramesList();
      if (textureAtlasWithImageAndFramesList2.type != "Success") {
        return undefined;
      }
      let textureAtlasWithImageAndFramesList3 =
        textureAtlasWithImageAndFramesList2.value;
      let result = new Map<string, FrameState>();
      for (let entry of textureAtlasWithImageAndFramesList3) {
        for (let entry2 of entry.frames) {
          result.set(entry2.frameId, entry2.frame);
        }
      }
      return result;
    });
    let textureAtlasFilename_frameName_toFrameIdMap = createMemo(() => {
      let textureAtlasWithImageAndFramesList2 =
        textureAtlasWithImageAndFramesList();
      if (textureAtlasWithImageAndFramesList2.type != "Success") {
        return undefined;
      }
      let textureAtlasWithImageAndFramesList3 =
        textureAtlasWithImageAndFramesList2.value;
      let result = new Map<string, string>();
      for (let entry of textureAtlasWithImageAndFramesList3) {
        for (let entry2 of entry.frames) {
          result.set(
            entry.textureAtlasFilename() + "/" + entry2.frame.name,
            entry2.frameId,
          );
        }
      }
      return result;
    });
    let lookupFrameIdByTextureAtlasFilenameAndFrameName_ = new ReactiveCache<
      string | undefined
    >();
    let lookupFrameIdByTextureAtlasFilenameAndFrameName = (
      textureAtlasFilename: string,
      frameName: string,
    ) =>
      lookupFrameIdByTextureAtlasFilenameAndFrameName_.cached(
        textureAtlasFilename + "/" + frameName,
        () =>
          textureAtlasFilename_frameName_toFrameIdMap()?.get(
            textureAtlasFilename + "/" + frameName,
          ),
      );
    let lookupFrameById_ = new ReactiveCache<FrameState | undefined>();
    let lookupFrameById = (frameId: string) =>
      lookupFrameById_.cached(frameId, () => frameIdToFrameMap()?.get(frameId));
    let lookupSpriteSheetFromTextureAtlasRef_ = new ReactiveCache<
      | Spritesheet<{
          frames: Dict<SpritesheetFrameData>;
          meta: {
            image: string;
            scale: number;
          };
        }>
      | undefined
    >();
    let images = createMemo(() => {
      let textureAtlasWithImageAndFramesList2 =
        textureAtlasWithImageAndFramesList();
      if (textureAtlasWithImageAndFramesList2.type != "Success") {
        return [];
      }
      let textureAtlasWithImageAndFramesList3 =
        textureAtlasWithImageAndFramesList2.value;
      return textureAtlasWithImageAndFramesList3.map((entry) => entry.image);
    });
    let [imageLoadCount, setImageLoadCount] = createSignal(0);
    createComputed(
      mapArray(images, (image) => {
        Assets.load({
          src: image.src,
          format: "png",
          loadParser: "loadTextures",
        }).then(() => setImageLoadCount((x) => x + 1));
        onCleanup(() => {
          Assets.unload(image.src);
          setImageLoadCount((x) => x - 1);
        });
      }),
    );
    let areAllImagesLoaded = createMemo(() => {
      return (
        imageLoadCount() == images().length &&
        textureAtlasWithImageAndFramesList().type == "Success"
      );
    });
    let [state, setState] = createStore<{
      windowWidth: number;
      windowHeight: number;
    }>({
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
    });
    let onResize = () => {
      batch(() => {
        setState("windowWidth", window.innerWidth);
        setState("windowHeight", window.innerHeight);
      });
    };
    window.addEventListener("resize", onResize);
    onCleanup(() => {
      window.removeEventListener("resize", onResize);
    });
    let world = params.world;
    let pixiApp: Resource<Application<Renderer>>;
    {
      const app = new Application();
      [pixiApp] = createResource(async () => {
        await app.init({ background: "#00f8f8", resizeTo: window });
        return app;
      });
      onCleanup(() => {
        app.destroy();
      });
    }
    let cameraTransform = createMemo(() => {
      let cameraEntities = world.entitiesWithComponentType(cameraComponentType);
      if (cameraEntities.length != 1) {
        return Transform2D.identity;
      }
      let cameraEntity = cameraEntities[0];
      let transform = world.getComponent(cameraEntity, transform2DComponentType)
        ?.state.transform;
      return transform ?? Transform2D.identity;
    });
    let cameraPos = () => cameraTransform().origin;
    Cont.liftCC(
      on([pixiApp, areAllImagesLoaded], ([pixiApp, areAllImagesLoaded]) => {
        if (pixiApp == undefined) {
          return undefined;
        }
        if (!areAllImagesLoaded) {
          return undefined;
        }
        pixiApp.stage.sortableChildren = true;
        {
          let scopeDone = false;
          onCleanup(() => {
            scopeDone = true;
          });
          let render = () => {
            if (scopeDone) {
              return;
            }
            // Get camera to track entity if target entity set
            (() => {
              let cameraEntities =
                world.entitiesWithComponentType(cameraComponentType);
              if (cameraEntities.length != 1) {
                return;
              }
              let cameraEntity = cameraEntities[0];
              let camera = world.getComponent(
                cameraEntity,
                cameraComponentType,
              );
              if (camera == undefined) {
                return;
              }
              let targetEntity = camera.state.targetEntity;
              if (targetEntity == undefined) {
                return;
              }
              let targetPos =
                world.getComponent(targetEntity, transform2DComponentType)
                  ?.state.transform.origin ?? Vec2.zero;
              let cameraPos2 = cameraPos();
              let minX = cameraPos2.x + 0.25 * state.windowWidth;
              let maxX = cameraPos2.x + 0.75 * state.windowWidth;
              let minY = cameraPos2.y + 0.25 * state.windowHeight;
              let maxY = cameraPos2.y + 0.75 * state.windowHeight;
              let cameraPosChanged: boolean = false;
              let newCameraPosX = cameraPos2.x;
              let newCameraPosY = cameraPos2.y;
              if (targetPos.x < minX) {
                newCameraPosX = cameraPos2.x + (targetPos.x - minX);
                cameraPosChanged = true;
              } else if (targetPos.x > maxX) {
                newCameraPosX = cameraPos2.x + (targetPos.x - maxX);
                cameraPosChanged = true;
              }
              if (targetPos.y < minY) {
                newCameraPosY = cameraPos2.y + (targetPos.y - minY);
                cameraPosChanged = true;
              } else if (targetPos.y > maxY) {
                newCameraPosY = cameraPos2.y + (targetPos.y - maxY);
                cameraPosChanged = true;
              }
              if (cameraPosChanged) {
                let newCameraTransform = Transform2D.create(
                  Vec2.create(newCameraPosX, newCameraPosY),
                  Complex.rot0,
                );
                let transformComponent = world.getComponent(
                  cameraEntity,
                  transform2DComponentType,
                );
                if (transformComponent == undefined) {
                  transformComponent = transform2DComponentType.create({
                    transform: newCameraTransform,
                  });
                  world.setComponent(cameraEntity, transformComponent);
                } else {
                  transformComponent.setState("transform", newCameraTransform);
                }
              }
            })();
            //
            pixiApp.render();
            requestAnimationFrame(render);
          };
          requestAnimationFrame(render);
        }
        let spriteSheets = createSpriteSheets({
          textureAtlasWithImageAndFramesList,
        });
        let lookupSpriteSheetFromTextureAtlasRef = (textureAtlasRef: string) =>
          lookupSpriteSheetFromTextureAtlasRef_.cached(textureAtlasRef, () => {
            for (let entry of spriteSheets()) {
              if (entry.textureAtlasRef == textureAtlasRef) {
                return entry.spritesheet;
              }
            }
            return undefined;
          });
        let levelsFolder = createGetLevelsFolder();
        return {
          pixiApp,
          levelsFolder,
          lookupSpriteSheetFromTextureAtlasRef,
        };
      }),
    )
      .filterNonNullable()
      .then(
        ({ pixiApp, levelsFolder, lookupSpriteSheetFromTextureAtlasRef }) => {
          Cont.liftCCMA(() =>
            world.entitiesWithComponentType(spriteComponentType),
          )
            .then((entity) =>
              Cont.liftCC(() => {
                let sprite = world.getComponent(
                  entity,
                  spriteComponentType,
                )?.state;
                let space = () =>
                  world.getComponent(entity, transform2DComponentType)?.state
                    ?.transform;
                let scale = createMemo(
                  () =>
                    world.getComponent(entity, scaleComponentType)?.state.scale,
                );
                if (sprite == undefined) {
                  return undefined;
                }
                if (space == undefined) {
                  return undefined;
                }
                let spriteSheet = () =>
                  lookupSpriteSheetFromTextureAtlasRef(
                    sprite.textureAtlasFilename,
                  );
                let frameId = () =>
                  lookupFrameIdByTextureAtlasFilenameAndFrameName(
                    sprite.textureAtlasFilename,
                    sprite.frameName,
                  );
                let frame = () => {
                  let frameId2 = frameId();
                  if (frameId2 == undefined) {
                    return undefined;
                  }
                  return lookupFrameById(frameId2);
                };
                let hasSpriteSheet = createMemo(
                  () => spriteSheet() != undefined,
                );
                let hasFrameId = createMemo(() => frameId() != undefined);
                let hasFrame = createMemo(() => frame() != undefined);
                return {
                  spriteEntity: entity,
                  scale,
                  space,
                  spriteSheet,
                  frameId,
                  frame,
                  hasSpriteSheet,
                  hasFrameId,
                  hasFrame,
                };
              }),
            )
            .filterNonNullable()
            .then(
              ({
                spriteEntity,
                scale,
                space,
                spriteSheet,
                frameId,
                frame,
                hasSpriteSheet,
                hasFrameId,
                hasFrame,
              }) =>
                Cont.liftCC(() => {
                  if (!hasSpriteSheet()) {
                    return;
                  }
                  if (!hasFrameId()) {
                    return;
                  }
                  if (!hasFrame()) {
                    return;
                  }
                  let flipX = createMemo(() => world.getComponent(spriteEntity, flipXComponentType) != undefined);
                  let spriteSheet2 = spriteSheet as Accessor<
                    NonNullable<ReturnType<typeof spriteSheet>>
                  >;
                  let frameId2 = frameId as Accessor<
                    NonNullable<ReturnType<typeof frameId>>
                  >;
                  let frame2 = frame as Accessor<
                    NonNullable<ReturnType<typeof frame>>
                  >;
                  let sprite = new Sprite();
                  sprite.zIndex = 1;
                  createComputed(() => {
                    sprite.texture = spriteSheet2().textures[frameId2()];
                  });
                  createComputed(() => {
                    let space2 = cameraTransform().transformToSpace(
                      space() ?? Transform2D.identity,
                    );
                    sprite.x = space2.origin.x;
                    sprite.y = space2.origin.y;
                    sprite.angle = space2.orientation.getAngle();
                    let scale2 = scale() ?? 1.0;
                    if (flipX()) {
                      sprite.scale.set(-scale2, scale2);
                      sprite.x += frame2().size.x * scale2;
                    } else {
                      sprite.scale.set(scale2, scale2);
                    }
                  });
                  pixiApp.stage.addChild(sprite);
                  onCleanup(() => pixiApp.stage.removeChild(sprite));
                  return;
                }).then(() =>
                  Cont.liftCCMA(
                    () =>
                      world.getComponent(spriteEntity, childrenComponentType)
                        ?.state?.childIds ?? [],
                  )
                    .filterNonNullable()
                    .then((childId) =>
                      Cont.liftCC(
                        () =>
                          world.getComponent(
                            childId,
                            tileCollisionComponentType,
                          )?.state,
                      )
                        .filterNonNullable()
                        .then((tileCollision) =>
                          Cont.liftCC(
                            () =>
                              world.getComponent(
                                childId,
                                transform2DComponentType,
                              )?.state?.transform ?? Transform2D.identity,
                          ).map((transform) => ({
                            tileCollision,
                            transform,
                          })),
                        ),
                    )
                    .then(({ tileCollision, transform }) =>
                      Cont.liftCC(() => {
                        const square = new PIXI.Graphics();
                        square.beginPath();
                        square.moveTo(0, 0);
                        square.lineTo(0, tileCollision.height);
                        square.lineTo(
                          tileCollision.width,
                          tileCollision.height,
                        );
                        square.lineTo(tileCollision.width, 0);
                        square.closePath();
                        square.setFillStyle({
                          alpha: 0.5,
                          color: new PIXI.Color("red"),
                        });
                        square.fill();
                        let collisionSpace = cameraTransform().transformToSpace(
                          (space() ?? Transform2D.identity).transformFromSpace(
                            transform,
                          ),
                        );
                        square.x = collisionSpace.origin.x;
                        square.y = collisionSpace.origin.y;
                        pixiApp.stage.addChild(square);
                        onCleanup(() => {
                          pixiApp.stage.removeChild(square);
                          square.destroy();
                        });
                      }),
                    ),
                ),
            )
            .run();
          return Cont.liftCC(
            on([levelsFolder], ([levelsFolder]) => {
              if (levelsFolder.type != "Success") {
                return;
              }
              let levelsFolder2 = levelsFolder.value;
              let levelRefEntities = () =>
                world.entitiesWithComponentType(levelRefComponentType);
              return {
                pixiApp,
                levelsFolder: levelsFolder2,
                lookupSpriteSheetFromTextureAtlasRef,
                levelRefEntities,
              };
            }),
          );
        },
      )
      .filterNonNullable()
      .then(
        ({
          pixiApp,
          levelsFolder,
          lookupSpriteSheetFromTextureAtlasRef,
          levelRefEntities,
        }) =>
          Cont.liftCCMA(levelRefEntities).then((levelRefEntity) =>
            Cont.liftCC(() => {
              let levelRef = world.getComponent(
                levelRefEntity,
                levelRefComponentType,
              )?.state;
              if (levelRef == undefined) {
                return;
              }
              let levelFileId = createMemo(() => {
                for (let entry of levelsFolder.contents) {
                  if (
                    entry.name == levelRef.levelFilename &&
                    entry.type == "File"
                  ) {
                    return entry.id;
                  }
                }
                return undefined;
              });
              return {
                pixiApp,
                levelsFolder,
                lookupSpriteSheetFromTextureAtlasRef,
                levelFileId,
              };
            }),
          ),
      )
      .filterNonNullable()
      .then(
        ({
          pixiApp,
          levelsFolder,
          lookupSpriteSheetFromTextureAtlasRef,
          levelFileId,
        }) =>
          Cont.liftCC(
            on(levelFileId, (levelFileId) => {
              if (levelFileId == undefined) {
                return;
              }
              let levelFile = levelsFolder.openFileById(levelFileId);
              return {
                pixiApp,
                levelFile,
                lookupSpriteSheetFromTextureAtlasRef,
              };
            }),
          ),
      )
      .filterNonNullable()
      .then(({ pixiApp, levelFile, lookupSpriteSheetFromTextureAtlasRef }) =>
        Cont.liftCC(
          on(levelFile, (levelFile) => {
            if (levelFile.type != "Success") {
              return;
            }
            let levelFile2 = levelFile.value;
            let r = EcsWorldAutomergeProjection.create(
              registry,
              levelFile2.docHandle,
            );
            if (r.type == "Err") {
              return;
            }
            let world = r.value;
            return {
              world,
              pixiApp,
              lookupSpriteSheetFromTextureAtlasRef,
            };
          }),
        ),
      )
      .filterNonNullable()
      .then(({ world, pixiApp, lookupSpriteSheetFromTextureAtlasRef }) =>
        Cont.liftCCMA(() => world.entitiesWithComponentType(levelComponentType))
          .then((levelEntity) =>
            Cont.liftCC(() =>
              world.getComponent(levelEntity, levelComponentType),
            ),
          )
          .filterNonNullable()
          .map((levelComponent) => ({
            pixiApp,
            lookupSpriteSheetFromTextureAtlasRef,
            levelComponent,
          })),
      )
      .then(
        ({ pixiApp, lookupSpriteSheetFromTextureAtlasRef, levelComponent }) =>
          Cont.liftCC(() => {
            let levelState = levelComponent.state;
            let container = renderLevel({
              windowSize: {
                get width() {
                  return state.windowWidth;
                },
                get height() {
                  return state.windowHeight;
                },
              },
              get cameraX() {
                return cameraPos().x;
              },
              get cameraY() {
                return cameraPos().y;
              },
              levelState,
              lookupSpriteSheetFromTextureAtlasRef,
              lookupFrameById,
            });
            pixiApp.stage.addChild(container);
            onCleanup(() => {
              pixiApp.stage.removeChild(container);
            });
          }),
      )
      .run();
    this.pixiApp = () => pixiApp();
  }
}

function createSpriteSheets(params: {
  textureAtlasWithImageAndFramesList: Accessor<
    AsyncResult<
      {
        textureAtlasFilename: Accessor<string>;
        textureAtlas: TextureAtlasState;
        image: HTMLImageElement;
        frames: {
          frameId: string;
          frame: FrameState;
        }[];
      }[]
    >
  >;
}): Accessor<
  {
    /** This is the texture atlas filename for now. */
    textureAtlasRef: string;
    //
    imageRef: string;
    spritesheet: Spritesheet<{
      frames: Dict<SpritesheetFrameData>;
      meta: {
        image: string;
        scale: number;
      };
    }>;
  }[]
> {
  let textureAtlasWithImageAndFramesList = createMemo(
    on(
      params.textureAtlasWithImageAndFramesList,
      (textureAtlasWithImageAndFramesList2) => {
        if (textureAtlasWithImageAndFramesList2.type != "Success") {
          return [];
        }
        return textureAtlasWithImageAndFramesList2.value;
      },
    ),
  );
  let result_ = createMemo(
    mapArray(textureAtlasWithImageAndFramesList, (entry) =>
      createMemo(() => {
        let texture = Texture.from(entry.image.src);
        onCleanup(() => texture.destroy());
        let frames: Dict<SpritesheetFrameData> = {};
        for (let { frameId, frame } of entry.frames) {
          frames[frameId] = {
            frame: {
              x: frame.pos.x,
              y: frame.pos.y,
              w: frame.size.x,
              h: frame.size.y,
            },
            sourceSize: { w: frame.size.x, h: frame.size.y },
            spriteSourceSize: { x: 0, y: 0, w: frame.size.x, h: frame.size.y },
          };
        }
        let atlasData = {
          frames,
          meta: {
            image: entry.image.src,
            scale: 1.0,
          },
        };
        let spritesheet = new Spritesheet(texture, atlasData);
        spritesheet.parse();
        return {
          textureAtlasRef: entry.textureAtlasFilename(),
          imageRef: entry.textureAtlas.imageRef,
          spritesheet,
        };
      }),
    ),
  );
  return createMemo(() => result_().map((x) => x()));
}

function renderLevel(props: {
  windowSize: { width: number; height: number };
  cameraX: number;
  cameraY: number;
  levelState: LevelState;
  lookupSpriteSheetFromTextureAtlasRef: (textureAtlasRef: string) =>
    | Spritesheet<{
        frames: Dict<SpritesheetFrameData>;
        meta: {
          image: string;
          scale: number;
        };
      }>
    | undefined;
  lookupFrameById: (frameId: string) => FrameState | undefined;
}): ContainerChild {
  let shortIdToTextureAtlasRefAndFrameIdMap = createMemo(() => {
    let result = new Map<
      number,
      { textureAtlasRef: string; frameId: string }
    >();
    for (let entry of props.levelState.tileToShortIdTable) {
      for (let frame of entry.frames) {
        result.set(frame.shortId, {
          textureAtlasRef: entry.textureAtlasRef,
          frameId: frame.frameId,
        });
      }
    }
    return result;
  });
  let shortIdToTextureAtlasRefAndFrameId_ = new ReactiveCache<
    { textureAtlasRef: string; frameId: string } | undefined
  >();
  let shortIdToTextureAtlasRefAndFrameId = (shortId: number) =>
    shortIdToTextureAtlasRefAndFrameId_.cached(`${shortId}`, () =>
      shortIdToTextureAtlasRefAndFrameIdMap().get(shortId),
    );
  const tileRenderWidth = () => 16 * 3;
  const tileRenderHeight = tileRenderWidth;
  const virtualTilesCountX = () =>
    Math.ceil(props.windowSize.width / tileRenderWidth()) + 1;
  const virtualTilesCountY = () =>
    Math.ceil(props.windowSize.height / tileRenderHeight()) + 1;
  const virtualWidth = () => tileRenderWidth() * virtualTilesCountX();
  const virtualHeight = () => tileRenderHeight() * virtualTilesCountY();
  let virtualTileXIndices = createMemo(() =>
    new Array(virtualTilesCountX()).fill(undefined).map((_, idx) => idx),
  );
  let virtualTileYIndices = createMemo(() =>
    new Array(virtualTilesCountY()).fill(undefined).map((_, idx) => idx),
  );
  let container: Container = new Container();
  createMemo(
    mapArray(virtualTileYIndices, (yIdx) => {
      let physicalY = createMemo(
        () => yIdx * tileRenderHeight() - props.cameraY,
      );
      let y = createMemo(
        () =>
          magicMod(physicalY() + tileRenderHeight(), virtualHeight()) -
          tileRenderHeight(),
      );
      let virtualYIdx = createMemo(
        () =>
          Math.floor(
            (virtualHeight() - physicalY() - tileRenderHeight()) /
              virtualHeight(),
          ) *
            virtualTilesCountY() +
          yIdx,
      );
      let rowContainer = new Container();
      //
      createMemo(
        mapArray(virtualTileXIndices, (idx) => {
          let physicalX = createMemo(
            () => idx * tileRenderWidth() - props.cameraX,
          );
          let x = createMemo(
            () =>
              magicMod(physicalX() + tileRenderWidth(), virtualWidth()) -
              tileRenderWidth(),
          );
          let virtualXIdx = createMemo(
            () =>
              Math.floor(
                (virtualWidth() - physicalX() - tileRenderWidth()) /
                  virtualWidth(),
              ) *
                virtualTilesCountX() +
              idx,
          );
          let cell = createMemo<
            | {
                spritesheet: Spritesheet<{
                  frames: Dict<SpritesheetFrameData>;
                  meta: {
                    image: string;
                    scale: number;
                  };
                }>;
                frameId: string;
              }
            | undefined
          >(() => {
            let vxIdx = virtualXIdx();
            let vyIdx = virtualYIdx();
            if (vyIdx < 0 || vyIdx >= props.levelState.mapData.length) {
              return undefined;
            }
            let row = props.levelState.mapData[vyIdx];
            if (vxIdx < 0 || vxIdx >= row.length) {
              return undefined;
            }
            let shortId = row[vxIdx];
            let textureAtlasRef_frameId =
              shortIdToTextureAtlasRefAndFrameId(shortId);
            if (textureAtlasRef_frameId == undefined) {
              return undefined;
            }
            let { textureAtlasRef, frameId } = textureAtlasRef_frameId;
            let spritesheet =
              props.lookupSpriteSheetFromTextureAtlasRef(textureAtlasRef);
            if (spritesheet == undefined) {
              return undefined;
            }
            return {
              spritesheet,
              frameId,
            };
          });
          // Debug stuff
          //
          /*
                    let text = new Text();
                    createMemo(() => {
                        text.text = `${virtualXIdx()}`;
                    });
                    createMemo(() => {
                        text.x = x();
                        text.y = y();
                    });
                    */
          //
          // Debug stuff
          //
          /*
                    let text = new Text();
                    createMemo(() => {
                        text.text = cell() ?? ""; //`${virtualXIdx().toString(16)},${virtualYIdx().toString(16)}`;
                    });
                    createMemo(() => {
                        text.x = x();
                        text.y = y();
                    });*/
          //
          //
          let sprite = new Sprite();
          sprite.scale = 3.0;
          createMemo(() => {
            let cell2 = cell();
            if (cell2 == undefined) {
              sprite.visible = false;
            } else {
              let frameData = props.lookupFrameById(cell2.frameId);
              if (frameData != undefined) {
                sprite.width = tileRenderWidth() * frameData.numCells.x;
                sprite.height = tileRenderHeight() * frameData.numCells.y;
              }
              sprite.texture = cell2.spritesheet.textures[cell2.frameId];
              sprite.visible = true;
            }
          });
          createMemo(() => {
            sprite.x = x();
            sprite.y = y();
          });
          rowContainer.addChild(sprite);
          onCleanup(() => {
            sprite.destroy();
            rowContainer.removeChild(sprite);
          });
          // Debug stuff
          //
          /*
                    rowContainer.addChild(text);
                    onCleanup(() => {
                        rowContainer.removeChild(text);
                    });*/
          //
          //
        }),
      );
      //
      container.addChild(rowContainer);
      onCleanup(() => {
        container.removeChild(rowContainer);
      });
    }),
  );
  return container;
}

function magicMod(a: number, b: number): number {
  let x = a % b;
  if (x < 0) {
    x += b;
  }
  return x;
}
