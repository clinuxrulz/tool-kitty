import { Accessor } from 'solid-js';
import { EcsWorld, IsEcsComponentType } from '../lib';
export declare function createMonsterLogicSystem(params: {
    world: EcsWorld;
    monsterLogicList: Accessor<{
        componentType: IsEcsComponentType;
        logic: (entity: string) => void;
    }[]>;
}): {
    nextFrame: () => void;
    dispose: () => void;
};
