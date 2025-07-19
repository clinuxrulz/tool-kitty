import { tsArray, tsObject, tsString, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";

const typeSchema = tsObject({
  sinks: tsArray(tsObject({
    entity: tsString(),
    pin: tsString(),
  })),
});

export type SourcesState = TypeSchemaType<typeof typeSchema>;

export const sourcesComponentType = new EcsComponentType({
  typeName: "Sources",
  typeSchema,
});
