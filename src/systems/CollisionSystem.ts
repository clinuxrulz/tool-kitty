import { levelRefComponentType } from "../components/LevelRefComponent";
import { EcsWorld } from "../ecs/EcsWorld";
import { createMemo, on, onCleanup } from "solid-js";
import {
  Complex,
  createGetLevelsFolder,
  createTextureAtlasWithImageAndFramesList,
  scaleComponentType,
  spriteComponentType,
  Transform2D,
  transform2DComponentType,
  Vec2,
} from "../lib";
import { EcsWorldAutomergeProjection } from "../ecs/EcsWorldAutomergeProjection";
import { registry } from "../level-builder/components/registry";
import { levelComponentType } from "../level-builder/components/LevelComponent";
import { Cont } from "../Cont";
import { tileCollisionComponentType } from "../components/TileCollisionComponent";
import { ReactiveCache } from "reactive-cache";
import { FrameState } from "../level-builder/components/FrameComponent";

export class CollisionSystem {
  constructor(params: { world: EcsWorld }) {
    let world = params.world;
    let levelsFolder = createGetLevelsFolder();
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
    Cont.liftCC(
      on(levelsFolder, (levelsFolder) => {
        if (levelsFolder.type != "Success") {
          return undefined;
        }
        let levelsFolder2 = levelsFolder.value;
        let levelRefEntities = () =>
          world.entitiesWithComponentType(levelRefComponentType);
        return {
          levelsFolder: levelsFolder2,
          levelRefEntities,
        };
      }),
    )
      .filterNonNullable()
      .then(({ levelsFolder, levelRefEntities }) =>
        Cont.liftCCMA(levelRefEntities)
          .map(
            (levelRefEntity) =>
              world.getComponent(levelRefEntity, levelRefComponentType)?.state,
          )
          .filterNonNullable()
          .map((levelRef) =>
            createMemo(() => {
              for (let entry of levelsFolder.contents) {
                if (
                  entry.name == levelRef.levelFilename &&
                  entry.type == "File"
                ) {
                  return entry.id;
                }
              }
              return undefined;
            }),
          )
          .map((levelFileId) => ({
            levelsFolder,
            levelFileId,
          })),
      )
      .then(({ levelsFolder, levelFileId }) =>
        Cont.liftCC(() => {
          let levelFileId2 = levelFileId();
          if (levelFileId2 == undefined) {
            return undefined;
          }
          return {
            levelFile: levelsFolder.openFileById(levelFileId2),
          };
        }),
      )
      .filterNonNullable()
      .then(({ levelFile }) =>
        Cont.liftCC(
          on(levelFile, (levelFile) => {
            if (levelFile.type != "Success") {
              return undefined;
            }
            let levelFile2 = levelFile.value;
            let r = EcsWorldAutomergeProjection.create(
              registry,
              levelFile2.docHandle,
            );
            if (r.type == "Err") {
              return undefined;
            }
            let levelWorld = r.value;
            let levelEntities = () =>
              levelWorld.entitiesWithComponentType(levelComponentType);
            return {
              levelWorld,
              levelEntities,
            };
          }),
        ),
      )
      .filterNonNullable()
      .then(({ levelWorld, levelEntities }) =>
        Cont.liftCCMA(levelEntities).map((levelEntity) => ({
          levelWorld,
          levelEntity,
        })),
      )
      .then(({ levelWorld, levelEntity }) =>
        Cont.liftCC(
          () => levelWorld.getComponent(levelEntity, levelComponentType)?.state,
        ),
      )
      .filterNonNullable()
      .map((x) => ({ level: x }))
      .then(({ level }) => {
        let shortIdToTextureAtlasAndFrameIdMap = new Map<
          number,
          {
            textureAtlasFilename: string;
            frameId: string;
          }
        >();
        for (let { textureAtlasRef, frames } of level.tileToShortIdTable) {
          for (let { frameId, shortId } of frames) {
            shortIdToTextureAtlasAndFrameIdMap.set(shortId, {
              textureAtlasFilename: textureAtlasRef,
              frameId,
            });
          }
        }
        return Cont.liftCCMA(() =>
          world.entitiesWithComponentType(spriteComponentType),
        )
          .then((spriteEntity) =>
            Cont.liftCC(() => {
              let sprite = world.getComponent(
                spriteEntity,
                spriteComponentType,
              )?.state;
              if (sprite == undefined) {
                return undefined;
              }
              let transform =
                world.getComponent(spriteEntity, transform2DComponentType)
                  ?.state.transform ?? Transform2D.identity;
              let scale =
                world.getComponent(spriteEntity, scaleComponentType)?.state
                  ?.scale ?? 1.0;
              return {
                spriteEntity,
                sprite,
                transform,
                scale,
              };
            }),
          )
          .filterNonNullable()
          .map(({ spriteEntity, sprite, transform, scale }) => ({
            level,
            shortIdToTextureAtlasAndFrameIdMap,
            spriteEntity,
            sprite,
            spriteTransform: transform,
            spriteScale: scale,
          }));
      })
      .then(
        ({
          level,
          shortIdToTextureAtlasAndFrameIdMap,
          spriteEntity,
          sprite,
          spriteTransform,
          spriteScale,
        }) =>
          Cont.liftCC(() => {
            const spritePos = spriteTransform.origin;
            const tileWidth = 16 * 3;
            const tileHeight = 16 * 3;
            let frameId = lookupFrameIdByTextureAtlasFilenameAndFrameName(
              sprite.textureAtlasFilename,
              sprite.frameName,
            );
            if (frameId == undefined) {
              return;
            }
            let frame = lookupFrameById(frameId);
            if (frame == undefined) {
              return;
            }
            const minXIdx = Math.floor(spritePos.x / tileWidth);
            const minYIdx = Math.floor(spritePos.y / tileHeight);
            const maxXIdx = Math.max(
              minXIdx,
              Math.ceil(
                (spritePos.x + frame.size.x * spriteScale) / tileWidth,
              ) - 1,
            );
            const maxYIdx = Math.max(
              minYIdx,
              Math.ceil(
                (spritePos.y + frame.size.y * spriteScale) / tileHeight,
              ) - 1,
            );
            for (let i = minYIdx; i <= maxYIdx; ++i) {
              let row = level.mapData[i];
              if (row == undefined) {
                continue;
              }
              for (let j = minXIdx; j <= maxXIdx; ++j) {
                let cell = row[j];
                if (cell == undefined) {
                  continue;
                }
                let data = shortIdToTextureAtlasAndFrameIdMap.get(cell);
                if (data == undefined) {
                  continue;
                }
                let cellFrame = lookupFrameById(data.frameId);
                if (cellFrame == undefined) {
                  continue;
                }
                let collisionId = world.createEntity([
                  transform2DComponentType.create({
                    transform: Transform2D.create(
                      Vec2.create(
                        j * tileWidth - spritePos.x,
                        i * tileHeight - spritePos.y,
                      ),
                      Complex.rot0,
                    ),
                  }),
                  tileCollisionComponentType.create({
                    textureAtlasFilename: data.textureAtlasFilename,
                    frameName: cellFrame.name,
                    width: tileWidth,
                    height: tileHeight,
                    metaData: cellFrame.metaData,
                  }),
                ]);
                world.attachToParent(collisionId, spriteEntity);
                onCleanup(() => {
                  world.detactFromParent(collisionId);
                  world.destroyEntity(collisionId);
                });
              }
            }
          }),
      )
      .run();
  }
}
