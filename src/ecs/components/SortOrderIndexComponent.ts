import { tsNumber, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../EcsComponent";

const typeSchema = tsObject({
  orderIndex: tsNumber(),
});

export type SortOrderIndexState = TypeSchemaType<typeof typeSchema>;

export const sortOrderIndexComponentType =
  new EcsComponentType<SortOrderIndexState>({
    typeName: "SortOrderIndex",
    typeSchema,
  });
