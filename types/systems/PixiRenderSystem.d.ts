import { Application, Renderer } from 'pixi.js';
import { Accessor } from 'solid-js';
import { EcsWorld } from '../ecs/EcsWorld';
export declare class PixiRenderSystem {
    pixiApp: Accessor<Application<Renderer> | undefined>;
    constructor(params: {
        world: EcsWorld;
    });
}
