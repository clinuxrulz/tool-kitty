import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  radius: tsMaybeUndefined(pinTypeSchema),
  height: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ConeState = TypeSchemaType<typeof typeSchema>;

export const coneComponentType = new EcsComponentType<ConeState>({
  typeName: "Cone",
  typeSchema,
});
