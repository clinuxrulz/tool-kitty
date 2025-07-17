import { EcsComponentType } from '../ecs/EcsComponent';
import { TypeSchemaType } from '../TypeSchema';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    textureAtlasFilename: string;
    frameName: string;
    width: number;
    height: number;
    metaData: any;
}>;
export type TileCollisionState = TypeSchemaType<typeof typeSchema>;
export declare const tileCollisionComponentType: EcsComponentType<{
    textureAtlasFilename: string;
    frameName: string;
    width: number;
    height: number;
    metaData: any;
}>;
export {};
