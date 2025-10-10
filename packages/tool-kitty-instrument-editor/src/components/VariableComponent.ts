import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsObject, tsString, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  id: tsString(),
  value: tsArray(pinTypeSchema),
});

export type VariableState = TypeSchemaType<typeof typeSchema>;

export const variableComponentType = new EcsComponentType<VariableState>({
  typeName: "Variable",
  typeSchema,
});
