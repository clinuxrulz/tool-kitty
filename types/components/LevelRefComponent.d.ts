import { EcsComponentType, TypeSchemaType } from '../lib';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    levelFilename: string;
}>;
export type LevelRefState = TypeSchemaType<typeof typeSchema>;
export declare const levelRefComponentType: EcsComponentType<{
    levelFilename: string;
}>;
export {};
