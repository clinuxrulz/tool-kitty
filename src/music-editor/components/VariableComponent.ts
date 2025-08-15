import { EcsComponentType } from "../../lib";
import { tsArray, tsObject, tsString, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  id: tsString(),
  value: tsArray(pinTypeSchema),
});

export type VariableState = TypeSchemaType<typeof typeSchema>;

export const variableComponentType = new EcsComponentType({
  typeName: "Variable",
  typeSchema,
});
