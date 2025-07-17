import { tsObject, tsString, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../EcsComponent";

const typeSchema = tsObject({
  parentId: tsString(),
});

export type ParentState = TypeSchemaType<typeof typeSchema>;

export const parentComponentType = new EcsComponentType<ParentState>({
  typeName: "Parent",
  typeSchema,
});
