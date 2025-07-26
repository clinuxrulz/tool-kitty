import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  timeToZero: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type ReleaseState = TypeSchemaType<typeof typeSchema>;

export const releaseComponentType = new EcsComponentType({
  typeName: "Release",
  typeSchema,
});
