import { TypeSchemaType } from '../../TypeSchema';
import { EcsComponentType } from '../EcsComponent';
declare const typeSchema: import('../../TypeSchema').TypeSchemaObject<{
    childIds: string[];
}>;
export type ChildrenState = TypeSchemaType<typeof typeSchema>;
export declare const childrenComponentType: EcsComponentType<{
    childIds: string[];
}>;
export {};
