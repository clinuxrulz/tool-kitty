import { EcsComponentType } from '../ecs/EcsComponent';
import { Transform2D } from '../math/Transform2D';
import { TypeSchemaType } from '../TypeSchema';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    transform: Transform2D;
}>;
export type Transform2DState = TypeSchemaType<typeof typeSchema>;
export declare const transform2DComponentType: EcsComponentType<{
    transform: Transform2D;
}>;
export {};
