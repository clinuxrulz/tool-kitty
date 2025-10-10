import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  next: tsArray(pinTypeSchema),
});

export type StartState = TypeSchemaType<typeof typeSchema>;

export const startComponentType = new EcsComponentType<StartState>({
  typeName: "Start",
  typeSchema,
});
