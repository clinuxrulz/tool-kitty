import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  radius: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type SphereState = TypeSchemaType<typeof typeSchema>;

export const sphereComponentType = new EcsComponentType<SphereState>({
  typeName: "Sphere",
  typeSchema,
});
