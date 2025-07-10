import { EcsWorld } from '../lib';
import { SpawnState } from '../level-builder/components/SpawnComponent';
export declare function createSpawnSystem(params: {
    world: EcsWorld;
    doSpawn: (params: {
        spawn: SpawnState;
    }) => string | undefined;
}): {
    dispose: () => void;
};
