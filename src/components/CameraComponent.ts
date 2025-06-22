import { EcsComponentType } from "../ecs/EcsComponent";
import {
  tsMaybeUndefined,
  tsObject,
  tsString,
  TypeSchemaType,
} from "../TypeSchema";

const typeSchema = tsObject({
  targetEntity: tsMaybeUndefined(tsString()),
});

export type CameraState = TypeSchemaType<typeof typeSchema>;

export const cameraComponentType = new EcsComponentType<CameraState>({
  typeName: "Camera",
  typeSchema,
});
