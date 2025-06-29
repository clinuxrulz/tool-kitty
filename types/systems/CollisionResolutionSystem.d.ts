import { EcsWorld, Vec2 } from '../lib';
export declare function createCollisionResolutionSystem(params: {
    world: EcsWorld;
    isSolidBlock: (meta: any) => boolean;
    isPlatform: (meta: any) => boolean;
    maxSpeed: Vec2;
}): {
    dispose: () => void;
    update: () => void;
};
export declare class CollisionResolutionSystem {
    update: () => void;
    constructor(params: {
        world: EcsWorld;
        isSolidBlock: (meta: any) => boolean;
        isPlatform: (meta: any) => boolean;
        maxSpeed: Vec2;
    });
}
