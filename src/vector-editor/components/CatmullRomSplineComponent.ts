import { EcsComponentType } from "../../ecs/EcsComponent";
import {
  tsArray,
  tsBoolean,
  tsObject,
  TypeSchemaType,
  vec2TypeSchema,
} from "../../TypeSchema";

const typeSchema = tsObject({
  controlPoints: tsArray(vec2TypeSchema),
  isClosed: tsBoolean(),
});

export type CatmullRomSplineState = TypeSchemaType<typeof typeSchema>;

export const catmullRomSplineComponentType =
  new EcsComponentType<CatmullRomSplineState>({
    typeName: "CatmullRomSpline",
    typeSchema,
  });
