import { asyncSuccess } from "control-flow-as-value";
import { FrameState } from "../level-builder/components/FrameComponent";
import { children, childrenComponentType, Cont, createMemo, createRoot, createTextureAtlasWithImageAndFramesList, EcsWorld, onCleanup, spriteComponentType, tileCollisionComponentType, TileCollisionState, Transform2D, transform2DComponentType, Vec2, velocity2DComponentType } from "../lib";
import { onGroundComponentType } from "../components/OnGroundComponent";

export function createCollisionResolutionSystem(params: {
  world: EcsWorld,
  isSolidBlock: (meta: any) => boolean,
  isPlatform: (meta: any) => boolean,
  maxSpeed: Vec2,
}): {
  dispose: () => void,
  update: () => void,
} {
  return createRoot((dispose) => {
    let crs = new CollisionResolutionSystem(params);
    return {
      dispose,
      update: crs.update.bind(crs),
    };
  });
}

export class CollisionResolutionSystem {
  update: () => void;

  constructor(params: {
    world: EcsWorld,
    isSolidBlock: (meta: any) => boolean,
    isPlatform: (meta: any) => boolean,
    maxSpeed: Vec2,
  }) {
    let textureAtlasWithImageAndFramesList =
      createTextureAtlasWithImageAndFramesList();
    let filenameFrameNameToFrameMap = createMemo(() => {
      let atlasesAndFrames = textureAtlasWithImageAndFramesList();
      if (atlasesAndFrames.type != "Success") {
        return atlasesAndFrames;
      }
      let atlasesAndFrames2 = atlasesAndFrames.value;
      let result = new Map<string,FrameState>();
      for (let { textureAtlasFilename, frames } of atlasesAndFrames2) {
        let filename = textureAtlasFilename();
        for (let { frameId, frame, } of frames) {
          let key = filename + "/" + frame.name;
          result.set(key, frame);
        }
      }
      return asyncSuccess(result);
    });
    let filenameFrameNameToFrameFn = createMemo(() => {
      let filenameFrameNameToFrameMap2 = filenameFrameNameToFrameMap();
      if (filenameFrameNameToFrameMap2.type != "Success") {
        return undefined;
      }
      let filenameFrameNameToFrameMap3 = filenameFrameNameToFrameMap2.value;
      return (filename: string, frameName: string) =>
        filenameFrameNameToFrameMap3.get(filename + "/" + frameName);
    });
    let { world, isSolidBlock, isPlatform, } = params;;
    const scale = 3.0;
    const tileSize = 16 * scale;
    let update = () => {
      let filenameFrameNameToFrameFn2 = filenameFrameNameToFrameFn();
      if (filenameFrameNameToFrameFn2 == undefined) {
        return;
      }
      for (let spriteEntity of world.entitiesWithComponentType(spriteComponentType)) {
        let sprite = world.getComponent(spriteEntity, spriteComponentType)?.state;
        if (sprite == undefined) {
          continue;
        }
        let transformComponent = world.getComponent(spriteEntity, transform2DComponentType);
        if (transformComponent == undefined) {
          continue;
        }
        let velocityComponent = world.getComponent(spriteEntity, velocity2DComponentType);
        if (velocityComponent == undefined) {
          continue;
        }
        let wasOnGround = world.getComponent(spriteEntity, onGroundComponentType) != undefined;
        let frame = filenameFrameNameToFrameFn2(
          sprite.textureAtlasFilename,
          sprite.frameName,
        );
        if (frame == undefined) {
          return undefined;
        }
        let children = world.getComponent(
          spriteEntity,
          childrenComponentType,
        )?.state.childIds ?? [];
        if (children == undefined) {
          return undefined;
        }
        let tileCollisionsAtX: {
          [x: number]: {
            relPos: Vec2,
            collision: TileCollisionState,
          }[]
        } = {};
        let tileCollisionsAtY: {
          [y: number]: {
            relPos: Vec2,
            collision: TileCollisionState,
          }[]
        } = {};
        let collisions: {
          relPos: Vec2,
          collision: TileCollisionState,
        }[] = [];
        for (let child of children) {
          let relPos = world.getComponent(child, transform2DComponentType)?.state.transform.origin ?? Vec2.zero;
          let collision = world.getComponent(child, tileCollisionComponentType)?.state;
          if (collision == undefined) {
            continue;
          }
          let x = relPos.x;
          let r = tileCollisionsAtX[x];
          if (r == undefined) {
            r = [];
            tileCollisionsAtX[x] = r;
          }
          let y = relPos.y;
          let r2 = tileCollisionsAtY[y];
          if (r2 == undefined) {
            r2 = [];
            tileCollisionsAtY[y] = r2;
          }
          let entry = { relPos, collision, };
          r.push(entry);
          r2.push(entry);
          collisions.push(entry);
        }
        for (let entry of Object.values(tileCollisionsAtX)) {
          entry.sort((a, b) => a.relPos.y - b.relPos.y);
        }
        let posX: number;
        let posY: number;
        let newPosX: number;
        let newPosY: number;
        let newVelX: number = velocityComponent.state.velocity.x;
        let newVelY: number = velocityComponent.state.velocity.y;
        let posChanged = false;
        let isOnGround = false;
        {
          let newPos = transformComponent.state.transform.origin;
          posX = newPos.x;
          posY = newPos.y;
          newPosX = newPos.x;
          newPosY = newPos.y;
        }
        for (let entry of collisions) {
          let { relPos, collision, } = entry;
          let leftCollision: TileCollisionState | undefined;
          let rightCollision: TileCollisionState | undefined;
          {
            let tmp = tileCollisionsAtY[relPos.y];
            let j = tmp.indexOf(entry);
            if (j != -1) {
              if (j > 0) {
                leftCollision = tmp[j-1].collision;
              }
              if (j < tmp.length-1) {
                rightCollision = tmp[j+1].collision;
              }
            }
          }
          let aboveCollision: TileCollisionState | undefined;
          let belowCollision: TileCollisionState | undefined;
          {
            let tmp = tileCollisionsAtX[relPos.x];
            let i = tmp.indexOf(entry);
            if (i != -1) {
              if (i > 0) {
                aboveCollision = tmp[i-1].collision;
              }
              if (i < tmp.length-1) {
                belowCollision = tmp[i+1].collision;
              }
            }
          }
          if (isSolidBlock(collision.metaData)) {
            if (
              belowCollision == undefined ||
              !isSolidBlock(belowCollision.metaData)
            ) {
              let d = relPos.y + tileSize;
              if (0 < d && d < params.maxSpeed.y && newVelY < 0) {
                newPosY = posY + d;
                newVelY = Math.max(newVelY, 0);
                posChanged = true;
              }
            }
            if (
              aboveCollision == undefined ||
              !isSolidBlock(aboveCollision.metaData)
            ) {
              let d = relPos.y - frame.size.y * scale;
              if (-params.maxSpeed.y < d && d < 0 && newVelY > 0) {
                newPosY = posY + d;
                newVelY = Math.min(newVelY, 0);
                posChanged = true;
                isOnGround = true;
              }
            }
            if (
              rightCollision == undefined ||
              !isSolidBlock(rightCollision.metaData)
            ) {
              let d = relPos.x + tileSize;
              if (0 < d && d < params.maxSpeed.x && newVelX < 0) {
                newPosX = posX + d;
                newVelX = Math.max(newVelX, 0);
                posChanged = true;
              }
            }
            if (
              leftCollision == undefined ||
              !isSolidBlock(leftCollision.metaData)
            ) {
              let d = relPos.x - frame.size.x * scale;
              if (-params.maxSpeed.y < d && d < 0 && newVelX > 0) {
                newPosX = posX + d;
                newVelX = Math.min(newVelX, 0);
                posChanged = true;
              }
            }
          }
          if (isPlatform(collision.metaData)) {
            let d = relPos.y - frame.size.y * scale;
            if (-params.maxSpeed.y < d && d < 0 && newVelY > 0) {
              newPosY = posY + d;
              newVelY = Math.min(newVelY, 0);
              posChanged = true;
              isOnGround = true;
            }
          }
        }
        if (posChanged) {
          transformComponent.setState("transform", (t) =>
            Transform2D.create(
              Vec2.create(newPosX, newPosY),
              t.orientation,
            )
          );
          velocityComponent.setState(
            "velocity",
            Vec2.create(
              newVelX,
              newVelY,
            ),
          );
        }
        if (isOnGround != wasOnGround) {
          if (isOnGround) {
            world.setComponent(
              spriteEntity,
              onGroundComponentType.create({}),
            );
          } else {
            world.unsetComponent(
              spriteEntity,
              onGroundComponentType,
            );
          }
        }
      }
    };
    this.update = update;
  }
}
