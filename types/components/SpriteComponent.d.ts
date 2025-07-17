import { EcsComponentType } from '../ecs/EcsComponent';
import { TypeSchemaType } from '../TypeSchema';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    textureAtlasFilename: string;
    frameName: string;
}>;
export type SpriteState = TypeSchemaType<typeof typeSchema>;
export declare const spriteComponentType: EcsComponentType<{
    textureAtlasFilename: string;
    frameName: string;
}>;
export {};
