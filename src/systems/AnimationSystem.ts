import { opToArr } from "../kitty-demo/util";
import { AnimationState } from "../level-builder/components/AnimationComponent";
import { FrameState } from "../level-builder/components/FrameComponent";
import { animatedComponentType, Cont, createMemo, createTextureAtlasWithImageAndFramesList, EcsWorld, onCleanup, spriteComponentType } from "../lib";

export class AnimationSystem {
  constructor(params: {
    world: EcsWorld,
  }) {
    let world = params.world;
    let scopeDone = false;
    onCleanup(() => {
      scopeDone = true;
    });
    let atlases = createTextureAtlasWithImageAndFramesList();
    let lookups = createMemo(() => {
      let frameIdToFrameMap = new Map<string,FrameState>();
      let atlasFilename_animationName_toAnimationMap = new Map<string,{ animationId: string, animation: AnimationState, }>();
      let atlases2 = atlases();
      if (atlases2.type != "Success") {
        return undefined;
      }
      let atlases3 = atlases2.value;
      for (let atlas of atlases3) {
        for (let { frameId, frame, } of atlas.frames) {
          frameIdToFrameMap.set(frameId, frame);
        }
        for (let { animationId, animation } of atlas.animations) {
          atlasFilename_animationName_toAnimationMap.set(
            atlas.textureAtlasFilename() + "/" + animation.name,
            {
              animationId,
              animation,
            }
          );
        }
      }
      return {
        frameIdToFrameMap,
        atlasFilename_animationName_toAnimationMap,
      };
    });
    let frameIdToFrame = (frameId: string) => {
      let lookups2 = lookups();
      if (lookups2 == undefined) {
        return undefined;
      }
      return lookups2.frameIdToFrameMap.get(frameId);
    };
    let atlasFilenameAndAnimationNameToAnimation = (atlasFilename: string, animationName: string) => {
      let lookups2 = lookups();
      if (lookups2 == undefined) {
        return undefined;
      }
      return lookups2.atlasFilename_animationName_toAnimationMap.get(atlasFilename + "/" + animationName);
    };
    let animationRunning = false;
    let animationCallbacks: ((t: number) => void)[] = [];
    let animate = (t: number) => {
      if (scopeDone || animationCallbacks.length == 0) {
        animationRunning = false;
        return;
      }
      for (let callback of animationCallbacks) {
        callback(t);
      }
      requestAnimationFrame(animate);
    };
    let registerAnimationCallback = (callback: (t: number) => void) => {
      animationCallbacks.push(callback);
      if (!animationRunning) {
        animationRunning = true;
        requestAnimationFrame(animate);
      }
    };
    let deregisterAnimationCallback = (callback: (t: number) => void) => {
      let idx = animationCallbacks.indexOf(callback);
      if (idx == -1) {
        return;
      }
      animationCallbacks.splice(idx, 1);
    };
    Cont
      .liftCCMA(
        () => world.entitiesWithComponentType(animatedComponentType)
      )
      .then(
        (entity) => Cont.liftCC(() => {
          let animatedComponent = world.getComponent(entity, animatedComponentType);
          if (animatedComponent == undefined) {
            return undefined;
          }
          return { entity, animatedComponent, };
        })
      )
      .filterNonNullable()
      .then(({ entity, animatedComponent, }) =>
        Cont
          .liftCC(() =>
            atlasFilenameAndAnimationNameToAnimation(
              animatedComponent.state.textureAtlasFilename,
              animatedComponent.state.animationName,
            )
          )
          .filterNonNullable()
          .then(({ animation }) =>
            Cont.liftCC(() =>
              animation.frameIds.flatMap((frameId) =>
                opToArr(frameIdToFrame(frameId))
              )
            )
          )
          .filter((frames) => frames.length != 0)
          .then((frames) =>
            Cont.liftCC(() => {
              let t0: number | undefined = undefined;
              let fps = 10;
              let frameDelayMs = 1000 / fps;
              let atT = 0;
              let animationCallback = (t: number) => {
                if (t0 == undefined) {
                  t0 = t;
                }
                t -= t0;
                while (atT < t) {
                  {
                    let frameIdx = animatedComponent.state.frameIndex;
                    while (frameIdx >= frames.length) {
                      frameIdx -= frames.length;
                    }
                    let nextFrameIdx = (frameIdx + 1) % frames.length;
                    animatedComponent.setState("frameIndex", nextFrameIdx);
                    let frame = frames[frameIdx];
                    let spriteComponent = world.getComponent(entity, spriteComponentType);
                    if (spriteComponent == undefined) {
                      spriteComponent = spriteComponentType.create({
                        textureAtlasFilename: animatedComponent.state.textureAtlasFilename,
                        frameName: frame.name,
                      });
                      world.setComponent(entity, spriteComponent);
                    } else {
                      spriteComponent.setState({
                        textureAtlasFilename: animatedComponent.state.textureAtlasFilename,
                        frameName: frame.name,
                      });
                    }
                  }
                  atT += frameDelayMs;
                }
              };
              registerAnimationCallback(animationCallback);
              onCleanup(() => {
                deregisterAnimationCallback(animationCallback);
              });
            })
          )
      )
      .run();
  }
}

