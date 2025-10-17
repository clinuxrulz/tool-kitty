import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  frequency: tsMaybeUndefined(pinTypeSchema),
  magnitude: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type SinXYZFieldState = TypeSchemaType<typeof typeSchema>;

export const sinXYZFieldComponentType = new EcsComponentType<SinXYZFieldState>({
  typeName: "SinXYZField",
  typeSchema,
});
