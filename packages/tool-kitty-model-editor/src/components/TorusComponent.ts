import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  radius1: tsMaybeUndefined(pinTypeSchema),
  radius2: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type TorusState = TypeSchemaType<typeof typeSchema>;

export const torusComponentType = new EcsComponentType<TorusState>({
  typeName: "Torus",
  typeSchema,
});
