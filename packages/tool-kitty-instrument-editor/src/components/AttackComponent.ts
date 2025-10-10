import { tsArray, tsMaybeUndefined, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  timeToOne: tsMaybeUndefined(pinTypeSchema),
  out: tsArray(pinTypeSchema),
});

export type AttackState = TypeSchemaType<typeof typeSchema>;

export const attackComponentType = new EcsComponentType<AttackState>({
  typeName: "Attack",
  typeSchema,
});
