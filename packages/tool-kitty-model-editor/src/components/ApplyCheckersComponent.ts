import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  colour1: tsMaybeUndefined(pinTypeSchema),
  colour2: tsMaybeUndefined(pinTypeSchema),
  size: tsMaybeUndefined(pinTypeSchema),
  model: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ApplyCheckersState = TypeSchemaType<typeof typeSchema>;

export const applyCheckersComponentType = new EcsComponentType<ApplyCheckersState>({
  typeName: "ApplyCheckers",
  typeSchema,
});

