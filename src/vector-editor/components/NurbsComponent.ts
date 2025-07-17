import { EcsComponentType } from "../../ecs/EcsComponent";
import {
  tsArray,
  tsBoolean,
  tsNumber,
  tsObject,
  TypeSchemaType,
  vec2TypeSchema,
} from "../../TypeSchema";
import { Vec2 } from "../../math/Vec2";

const typeSchema = tsObject({
  controlPoints: tsArray(vec2TypeSchema),
  weights: tsArray(tsNumber()),
  degree: tsNumber(),
  closed: tsBoolean(),
});

export type NurbsState = TypeSchemaType<typeof typeSchema>;

export const nurbsComponentType = new EcsComponentType<NurbsState>({
  typeName: "Nurbs",
  typeSchema,
});
