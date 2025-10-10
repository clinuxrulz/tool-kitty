import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  prev: tsMaybeUndefined(pinTypeSchema),
  entry: tsMaybeUndefined(pinTypeSchema),
  next: tsArray(pinTypeSchema),
});

export type GotoState = TypeSchemaType<typeof typeSchema>;

export const gotoComponentType = new EcsComponentType<GotoState>({
  typeName: "Goto",
  typeSchema,
});
