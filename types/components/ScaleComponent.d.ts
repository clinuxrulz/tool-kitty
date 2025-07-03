import { EcsComponentType } from '../ecs/EcsComponent';
import { TypeSchemaType } from '../TypeSchema';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    scale: number;
}>;
export type ScaleState = TypeSchemaType<typeof typeSchema>;
export declare const scaleComponentType: EcsComponentType<{
    scale: number;
}>;
export {};
