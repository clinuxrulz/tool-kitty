import { TypeSchemaType } from '../../TypeSchema';
import { EcsComponentType } from '../EcsComponent';
declare const typeSchema: import('../../TypeSchema').TypeSchemaObject<{
    parentId: string;
}>;
export type ParentState = TypeSchemaType<typeof typeSchema>;
export declare const parentComponentType: EcsComponentType<{
    parentId: string;
}>;
export {};
