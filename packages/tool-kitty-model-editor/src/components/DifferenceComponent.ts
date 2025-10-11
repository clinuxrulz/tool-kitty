import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model1: tsMaybeUndefined(pinTypeSchema),
  model2: tsMaybeUndefined(pinTypeSchema),
  k: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type DifferenceState = TypeSchemaType<typeof typeSchema>;

export const differenceComponentType = new EcsComponentType<DifferenceState>({
  typeName: "Difference",
  typeSchema,
});
