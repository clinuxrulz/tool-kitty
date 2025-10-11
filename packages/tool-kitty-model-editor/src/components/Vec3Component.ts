import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  x: tsMaybeUndefined(pinTypeSchema),
  y: tsMaybeUndefined(pinTypeSchema),
  z: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type Vec3State = TypeSchemaType<typeof typeSchema>;

export const vec3ComponentType = new EcsComponentType<Vec3State>({
  typeName: "Vec3",
  typeSchema,
});
