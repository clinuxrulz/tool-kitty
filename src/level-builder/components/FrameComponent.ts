import { EcsComponentType } from "../../ecs/EcsComponent";
import {
  tsJson,
  tsObject,
  tsString,
  TypeSchemaType,
  vec2TypeSchema,
} from "../../TypeSchema";
import { Vec2 } from "../../math/Vec2";

const typeSchema = tsObject({
  name: tsString(),
  pos: vec2TypeSchema,
  size: vec2TypeSchema,
  numCells: vec2TypeSchema,
  metaData: tsJson(),
});

export type FrameState = TypeSchemaType<typeof typeSchema>;

export const frameComponentType = new EcsComponentType<FrameState>({
  typeName: "FrameState",
  typeSchema,
});
