import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  prev: tsMaybeUndefined(pinTypeSchema),
  delay: tsMaybeUndefined(pinTypeSchema),
  next: tsArray(pinTypeSchema),
});

export type DelayState = TypeSchemaType<typeof typeSchema>;

export const delayComponentType = new EcsComponentType<DelayState>({
  typeName: "Delay",
  typeSchema,
});
