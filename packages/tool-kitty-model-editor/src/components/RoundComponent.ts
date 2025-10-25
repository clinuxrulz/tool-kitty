import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  radius: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type RoundState = TypeSchemaType<typeof typeSchema>;

export const roundComponentType = new EcsComponentType<RoundState>({
  typeName: "Round",
  typeSchema,
});
