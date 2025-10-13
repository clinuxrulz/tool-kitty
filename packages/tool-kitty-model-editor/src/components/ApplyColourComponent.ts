import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  colour: tsMaybeUndefined(pinTypeSchema),
  model: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ApplyColourState = TypeSchemaType<typeof typeSchema>;

export const applyColourComponentType = new EcsComponentType<ApplyColourState>({
  typeName: "ApplyColour",
  typeSchema,
});
