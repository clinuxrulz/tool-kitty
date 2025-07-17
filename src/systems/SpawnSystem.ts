import { batch, createComputed, createMemo, createRoot, onCleanup } from "solid-js";
import { cameraComponentType, Cont, createGetLevelsFolder, createTextureAtlasWithImageAndFramesList, EcsWorld, levelRefComponentType, Transform2D, transform2DComponentType } from "../lib";
import { FrameState } from "../level-builder/components/FrameComponent";
import { ReactiveCache } from "reactive-cache";
import { createStore } from "solid-js/store";
import { EcsWorldAutomergeProjection } from "../ecs/EcsWorldAutomergeProjection";
import { registry } from "../level-builder/components/registry";
import { levelComponentType } from "../level-builder/components/LevelComponent";
import { spawnComponentType, SpawnState } from "../level-builder/components/SpawnComponent";

export function createSpawnSystem(params: {
  world: EcsWorld,
  doSpawn: (params: { spawn: SpawnState, }) =>  string | undefined,
}): {
  dispose: () => void,
} {
  const TILE_SIZE = 16*3;
  let { doSpawn, } = params;
  let { dispose, } = createRoot((dispose) => {
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
    let levelsFolder = createGetLevelsFolder();
    Cont
      .liftCC(() => world.entitiesWithComponentType(levelRefComponentType))
      .then((levelRefEntities) =>
        Cont.liftCC(() => {
          if (levelRefEntities.length != 1) {
            return undefined;
          }
          let levelRefEntity = levelRefEntities[0];
          return world.getComponent(levelRefEntity, levelRefComponentType)?.state.levelFilename;
        })
      )
      .filterNonNullable()
      .then((levelFilename) =>
        Cont.liftCC(() => {
          let levelsFolder2 = levelsFolder();
          if (levelsFolder2.type != "Success") {
            return undefined;
          }
          let levelsFolder3 = levelsFolder2.value;
          for (let entry of levelsFolder3.contents) {
            if (entry.type != "File") {
              continue;
            }
            if (entry.name == levelFilename) {
              return levelsFolder3.openFileById(entry.id);
            }
          }
          return undefined;
        })
      )
      .filterNonNullable()
      .then((levelFile) =>
        Cont.liftCC(() => {
          let levelFile2 = levelFile();
          if (levelFile2.type != "Success") {
            return undefined;
          }
          return levelFile2.value;
        })
      )
      .filterNonNullable()
      .then((level) =>
        Cont.liftCC(() => {
          let r = EcsWorldAutomergeProjection.create(
            registry,
            level.docHandle,
          );
          if (r.type == "Err") {
            return undefined;
          }
          return r.value;
        })
      )
      .filterNonNullable()
      .then((level) => Cont.liftCC(() => {
        let levelIds = level.entitiesWithComponentType(levelComponentType);
        if (levelIds.length != 1) {
          return undefined;
        }
        let level2 = level.getComponent(levelIds[0], levelComponentType);
        if (level2 == undefined) {
          return undefined;
        }
        return {
          levelWorld: level,
          level: level2,
        };
      }))
      .filterNonNullable()
      .run(({ levelWorld, level, }) => {
        /**
         * key `${xCoordIdx}/${yCoordIdx}`
         * value entity
         */
        let alreadySpawnedMap = new Map<string,string>();
        let lastMinXIdx: number | undefined = undefined;
        let lastMaxXIdx: number | undefined = undefined;
        let lastMinYIdx: number | undefined = undefined;
        let lastMaxYIdx: number | undefined = undefined;
        let rangeIdx = createMemo(() => {
          let cameraPos2 = cameraPos();
          let minXIdx = Math.floor(cameraPos2.x / TILE_SIZE);
          let maxXIdx = minXIdx + Math.ceil(state.windowWidth / TILE_SIZE);
          let minYIdx = Math.floor(cameraPos2.y / TILE_SIZE);
          let maxYIdx = minYIdx + Math.ceil(state.windowHeight / TILE_SIZE);
          return {
            minXIdx, maxXIdx,
            minYIdx, maxYIdx,
          };
        });
        let shortIdToFrameIdMap = createMemo(() => {
          let result = new Map<number, string>();
          for (let entry of level.state.tileToShortIdTable) {
            for (let frame of entry.frames) {
              result.set(frame.shortId, frame.frameId);
            }
          }
          return result;
        });
        createComputed(() => {
          let cameraPos2 = cameraPos();
          let shortIdToFrameIdMap2 = shortIdToFrameIdMap();
          let frameIdToFrameMap2 = frameIdToFrameMap();
          if (frameIdToFrameMap2 == undefined) {
            return;
          }
          let toRemove: string[] = [];
          for (let [key, entity] of alreadySpawnedMap.entries()) {
            if (world.getComponent(entity, transform2DComponentType) == undefined) {
              toRemove.push(key);
            }
          }
          toRemove.forEach((key) => alreadySpawnedMap.delete(key));
          let newlyVisibleSpawns: { spawnEntity: string, spawn: SpawnState, }[] = [];
          for (let spawnEntity of levelWorld.entitiesWithComponentType(spawnComponentType)) {
            if (alreadySpawnedMap.has(spawnEntity)) {
              continue;
            }
            let spawn = levelWorld.getComponent(spawnEntity, spawnComponentType)?.state;
            if (spawn == undefined) {
              continue;
            }
            let x = spawn.pos.x - cameraPos2.x;
            let y = spawn.pos.y - cameraPos2.y;
            if (x < 0 || y < 0 || x > state.windowWidth || y > state.windowHeight) {
              continue;
            }
            newlyVisibleSpawns.push({
              spawnEntity,
              spawn,
            });
          }
          for (let newSpawn of newlyVisibleSpawns) {
            let entity = doSpawn({
              spawn: newSpawn.spawn,
            });
            if (entity != undefined) {
              alreadySpawnedMap.set(newSpawn.spawnEntity, entity);
            }
          }
        });
      });
    return { dispose, };
  });
  return {
    dispose,
  };
}
