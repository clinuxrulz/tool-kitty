import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  frequency: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type MeowState = TypeSchemaType<typeof typeSchema>;

export const meowComponentType = new EcsComponentType<MeowState>({
  typeName: "Meow",
  typeSchema,
});
