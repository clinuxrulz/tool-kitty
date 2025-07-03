import { EcsComponentType, TypeSchemaType, Vec2 } from '../lib';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    velocity: Vec2;
}>;
export type Velocity2DState = TypeSchemaType<typeof typeSchema>;
export declare const velocity2DComponentType: EcsComponentType<{
    velocity: Vec2;
}>;
export {};
