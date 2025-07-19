import { tsArray, tsObject, tsString, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";

const typeSchema = tsObject({
  sinks: tsArray(tsString()),
});

export type SinksState = TypeSchemaType<typeof typeSchema>;

export const sinksComponentType = new EcsComponentType({
  typeName: "Sinks",
  typeSchema,
});
