import { DocHandle } from '@automerge/automerge-repo';
import { EcsWorld } from '../EcsWorld';
import { EcsRegistry } from '../EcsRegistry';
import { Result } from '../../kitty-demo/Result';
export declare function createAutomergeEcsSyncSystem(params: {
    registry: EcsRegistry;
    world: EcsWorld;
    docHandle: DocHandle<any>;
}): Result<{
    dispose: () => void;
}>;
