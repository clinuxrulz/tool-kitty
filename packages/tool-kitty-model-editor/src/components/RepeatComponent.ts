import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  step: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type RepeatState = TypeSchemaType<typeof typeSchema>;

export const repeatComponentType = new EcsComponentType<RepeatState>({
  typeName: "Repeat",
  typeSchema,
});
