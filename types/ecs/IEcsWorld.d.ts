import { EcsComponent, EcsComponentType, IsEcsComponent, IsEcsComponentType } from './EcsComponent';
export interface IEcsWorld {
    entities(): string[];
    entitiesWithComponentType(componentType: IsEcsComponentType): string[];
    createEntityWithId(entityId: string, components: IsEcsComponent[]): void;
    createEntity(components: IsEcsComponent[]): string;
    destroyEntity(entityId: string): void;
    getComponent<A extends object>(entityId: string, componentType: EcsComponentType<A>): EcsComponent<A> | undefined;
    getComponents(entityId: string): IsEcsComponent[];
    setComponents(entityId: string, components: IsEcsComponent[]): void;
    unsetComponent(entityId: string, componentType: IsEcsComponentType): void;
    unsetComponents(entityId: string, componentTypes: IsEcsComponentType[]): void;
    debugInfo?(): string;
}
