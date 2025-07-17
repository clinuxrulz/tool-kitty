import {
  Accessor,
  createComputed,
  createRoot,
  mapArray,
  onCleanup,
} from "solid-js";
import {
  Cont,
  do_,
  EcsComponentType,
  EcsWorld,
  IsEcsComponentType,
  provideNextFrame,
  toPerFrameUpdateFn,
} from "../lib";

export function createMonsterLogicSystem(params: {
  world: EcsWorld;
  monsterLogicList: Accessor<
    {
      componentType: IsEcsComponentType;
      logic: (entity: string) => void;
    }[]
  >;
}): {
  nextFrame: () => void;
  dispose: () => void;
} {
  let { nextFrame, dispose } = createRoot((dispose) => {
    let updateSet = new Set<() => void>();
    let world = params.world;
    createComputed(
      mapArray(params.monsterLogicList, (monsterLogic) => {
        let monsterEntities = () =>
          world.entitiesWithComponentType(monsterLogic.componentType);
        createComputed(
          mapArray(monsterEntities, (monsterEntity) => {
            let update = toPerFrameUpdateFn(() =>
              monsterLogic.logic(monsterEntity),
            );
            updateSet.add(update);
            onCleanup(() => updateSet.delete(update));
          }),
        );
      }),
    );
    let nextFrame = () => updateSet.forEach((update) => update());
    return {
      nextFrame,
      dispose,
    };
  });
  return {
    nextFrame,
    dispose,
  };
}
