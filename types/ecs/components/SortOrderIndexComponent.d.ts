import { TypeSchemaType } from '../../TypeSchema';
import { EcsComponentType } from '../EcsComponent';
declare const typeSchema: import('../../TypeSchema').TypeSchemaObject<{
    orderIndex: number;
}>;
export type SortOrderIndexState = TypeSchemaType<typeof typeSchema>;
export declare const sortOrderIndexComponentType: EcsComponentType<{
    orderIndex: number;
}>;
export {};
