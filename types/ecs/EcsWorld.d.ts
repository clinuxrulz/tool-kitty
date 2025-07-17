import { EcsComponent, EcsComponentType, IsEcsComponent, IsEcsComponentType } from './EcsComponent';
import { Result } from '../kitty-demo/Result';
import { EcsRegistry } from './EcsRegistry';
import { IEcsWorld } from './IEcsWorld';
export declare class EcsWorld implements IEcsWorld {
    private entityMap;
    private componentTypeEntitiesMap;
    private componentTypeEntitiesMap_;
    constructor();
    entities(): string[];
    entitiesWithComponentType(componentType: IsEcsComponentType): string[];
    createEntityWithId(entityId: string, components: IsEcsComponent[]): void;
    createEntity(components: IsEcsComponent[]): string;
    destroyEntity(entityId: string): void;
    attachToParent(entityId: string, parentId: string): void;
    detactFromParent(entityId: string): void;
    getComponent<A extends object>(entityId: string, componentType: EcsComponentType<A>): EcsComponent<A> | undefined;
    getComponents(entityId: string): IsEcsComponent[];
    setComponent(entityId: string, component: IsEcsComponent): void;
    setComponents(entityId: string, components: IsEcsComponent[]): void;
    unsetComponent(entityId: string, componentType: IsEcsComponentType): void;
    unsetComponents(entityId: string, componentTypes: IsEcsComponentType[]): void;
    toJson(): any;
    static fromJson(registry: EcsRegistry, x: any): Result<EcsWorld>;
}
