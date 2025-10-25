import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  model: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type RevolutionState = TypeSchemaType<typeof typeSchema>;

export const revolutionComponentType = new EcsComponentType<RevolutionState>({
  typeName: "Revolution",
  typeSchema,
});
