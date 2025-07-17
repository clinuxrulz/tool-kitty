import { EcsComponentType } from '../ecs/EcsComponent';
import { TypeSchemaType } from '../TypeSchema';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    textureAtlasFilename: string;
    animationName: string;
    frameIndex: number;
}>;
export type AnimatedState = TypeSchemaType<typeof typeSchema>;
export declare const animatedComponentType: EcsComponentType<{
    textureAtlasFilename: string;
    animationName: string;
    frameIndex: number;
}>;
export {};
