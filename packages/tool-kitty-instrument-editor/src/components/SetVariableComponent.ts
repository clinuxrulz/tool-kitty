import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsMaybeUndefined, tsObject, tsString, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  id: tsString(),
  prev: tsMaybeUndefined(pinTypeSchema),
  value: tsMaybeUndefined(pinTypeSchema),
  next: tsArray(pinTypeSchema),
});

export type SetVariableState = TypeSchemaType<typeof typeSchema>;

export const setVariableComponentType = new EcsComponentType<SetVariableState>({
  typeName: "SetVariable",
  typeSchema,
});
