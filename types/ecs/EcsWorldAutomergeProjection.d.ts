import { Doc, DocHandle } from '@automerge/automerge-repo';
import { IsEcsComponentType, IsEcsComponent, EcsComponentType, EcsComponent } from './EcsComponent';
import { IEcsWorld } from './IEcsWorld';
import { EcsRegistry } from './EcsRegistry';
import { Result } from '../kitty-demo/Result';
export declare class EcsWorldAutomergeProjection implements IEcsWorld {
    private registry;
    private docHandle;
    private doc;
    private keepAliveMap;
    constructor(registry: EcsRegistry, docHandle: DocHandle<any>, doc: Doc<any>);
    static create(registry: EcsRegistry, docHandle: DocHandle<any>): Result<EcsWorldAutomergeProjection>;
    private _entitiesCache;
    entities(): string[];
    private _entitiesWithComponentTypeCache;
    entitiesWithComponentType(componentType: IsEcsComponentType): string[];
    createEntityWithId(entityId: string, components: IsEcsComponent[]): void;
    createEntity(components: IsEcsComponent[]): string;
    destroyEntity(entityId: string): void;
    getComponent<A extends object>(entityId: string, componentType: EcsComponentType<A>): EcsComponent<A> | undefined;
    getComponents(entityId: string): IsEcsComponent[];
    unsetComponent(entityId: string, componentType: IsEcsComponentType): void;
    unsetComponents(entityId: string, componentTypes: IsEcsComponentType[]): void;
    debugInfo(): string;
}
