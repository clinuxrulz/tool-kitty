import { Accessor } from 'solid-js';
import { EcsWorld } from './lib';
import { AutomergeVfsFolder, AutomergeVirtualFileSystem } from 'solid-fs-automerge';
import { AsyncResult } from 'control-flow-as-value';
import { TextureAtlasState } from './level-builder/components/TextureAtlasComponent';
import { FrameState } from './level-builder/components/FrameComponent';
import { AnimationState } from './level-builder/components/AnimationComponent';
export * from './ecs/EcsComponent';
export * from './ecs/EcsRegistry';
export * from './ecs/EcsWorld';
export * from './ecs/components/ChildrenComponent';
export * from './ecs/components/ParentComponent';
export * from './ecs/components/SortOrderIndexComponent';
export * from './TypeSchema';
export { PixiRenderSystem } from './systems/PixiRenderSystem';
export { createGmeSystem } from './systems/GmeSystem';
export { createMonsterLogicSystem } from './systems/MonsterLogicSystem';
export { createSpawnSystem } from './systems/SpawnSystem';
export { createVirtualDPadSystem } from './systems/VirtualDPadSystem';
export { CollisionResolutionSystem, createCollisionResolutionSystem } from './systems/CollisionResolutionSystem';
export * from 'solid-js';
export * from './Cont';
export * from './cont-do';
export * from './coroutine-dsl';
declare let systems: {
    PixiRenderSystem: (params: {
        world: EcsWorld;
    }) => void;
    CollisionSystem: (params: {
        world: EcsWorld;
    }) => void;
    AnimationSystem: (params: {
        world: EcsWorld;
    }) => void;
};
export type SystemName = keyof typeof systems;
export declare function useSystem(systemName: SystemName): () => void;
export declare const REQUIRED_FOR_KEEPING_MANUAL_CHUNKS: () => undefined;
export declare function launch(): void;
export declare const createAutomergeVfs: () => Accessor<{
    type: "Pending";
} | {
    type: "Failed";
    message: string;
} | {
    type: "Success";
    value: AutomergeVirtualFileSystem;
}>;
export declare const libUrl: string;
export declare const world: EcsWorld;
export { type AnimatedState, animatedComponentType, } from './components/AnimatedComponent';
export { type CameraState, cameraComponentType, } from './components/CameraComponent';
export { type FlipXState, flipXComponentType, } from './components/FlipXComponent';
export { type LevelRefState, levelRefComponentType, } from './components/LevelRefComponent';
export { type OnGroundState, onGroundComponentType, } from './components/OnGroundComponent';
export { type ScaleState, scaleComponentType, } from './components/ScaleComponent';
export { type SpriteState, spriteComponentType, } from './components/SpriteComponent';
export { type TileCollisionState, tileCollisionComponentType, } from './components/TileCollisionComponent';
export { type Transform2DState, transform2DComponentType, } from './components/Transform2DComponent';
export { type Velocity2DState, velocity2DComponentType, } from './components/Velocity2DComponent';
export { registry } from './components/registry';
export { Complex } from './math/Complex';
export { Transform2D } from './math/Transform2D';
export { Vec2 } from './math/Vec2';
export declare function fixRelativeUrl(relativeUrl: string): string;
export declare const createGetRootFolder: () => Accessor<AsyncResult<AutomergeVfsFolder>>;
export declare const createGetLevelsFolder: () => Accessor<AsyncResult<AutomergeVfsFolder>>;
export declare const createTextureAtlasWithImageAndFramesList: () => Accessor<AsyncResult<{
    textureAtlasFilename: Accessor<string>;
    textureAtlas: TextureAtlasState;
    image: HTMLImageElement;
    frames: {
        frameId: string;
        frame: FrameState;
    }[];
    animations: {
        animationId: string;
        animation: AnimationState;
    }[];
}[]>>;
