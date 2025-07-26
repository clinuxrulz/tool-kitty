import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  timeToOne: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type AttackState = TypeSchemaType<typeof typeSchema>;

export const attackComponentType = new EcsComponentType({
  typeName: "Attack",
  typeSchema,
});
