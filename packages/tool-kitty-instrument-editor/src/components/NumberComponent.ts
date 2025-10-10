import { tsArray, tsNumber, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  value: tsNumber(),
  out: tsArray(pinTypeSchema),
});

export type NumberState = TypeSchemaType<typeof typeSchema>;

export const numberComponentType = new EcsComponentType<NumberState>({
  typeName: "Number",
  typeSchema,
});
