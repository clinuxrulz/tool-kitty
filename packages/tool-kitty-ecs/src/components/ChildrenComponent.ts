import { tsArray, tsObject, tsString, TypeSchemaType } from "tool-kitty-type-schema";
import { EcsComponentType } from "../EcsComponent";

const typeSchema = tsObject({
  childIds: tsArray(tsString()),
});

export type ChildrenState = TypeSchemaType<typeof typeSchema>;

export const childrenComponentType = new EcsComponentType<ChildrenState>({
  typeName: "Children",
  typeSchema,
});
