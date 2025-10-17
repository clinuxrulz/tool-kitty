import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  count: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type RepeatRotationalState = TypeSchemaType<typeof typeSchema>;

export const repeatRotationalComponentType = new EcsComponentType<RepeatRotationalState>({
  typeName: "RepeatRotational",
  typeSchema,
});

