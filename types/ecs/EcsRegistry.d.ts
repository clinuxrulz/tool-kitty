import { IsEcsComponentType } from './EcsComponent';
export declare class EcsRegistry {
    componentTypes: IsEcsComponentType[];
    componentTypeMap: Map<string, IsEcsComponentType>;
    constructor(componentTypes: IsEcsComponentType[]);
}
