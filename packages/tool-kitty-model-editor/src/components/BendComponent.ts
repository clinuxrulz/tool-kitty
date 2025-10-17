import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  k: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type BendState = TypeSchemaType<typeof typeSchema>;

export const bendComponentType = new EcsComponentType<BendState>({
  typeName: "Bend",
  typeSchema,
});
