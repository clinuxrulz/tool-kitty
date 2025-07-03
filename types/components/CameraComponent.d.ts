import { EcsComponentType } from '../ecs/EcsComponent';
import { TypeSchemaType } from '../TypeSchema';
declare const typeSchema: import('../TypeSchema').TypeSchemaObject<{
    targetEntity: string | undefined;
}>;
export type CameraState = TypeSchemaType<typeof typeSchema>;
export declare const cameraComponentType: EcsComponentType<{
    targetEntity: string | undefined;
}>;
export {};
