import { EcsComponentType } from "tool-kitty-ecs";
import { pinTypeSchema } from "tool-kitty-node-editor";
import { tsArray, tsNumber, tsObject, TypeSchema, TypeSchemaType } from "tool-kitty-type-schema";

const typeSchema = tsObject({
  value: tsNumber(),
  sensitivity: tsNumber(),
  out: tsArray(pinTypeSchema),
});

export type UnboundKnobState = TypeSchemaType<typeof typeSchema>;

export const unboundKnobComponentType = new EcsComponentType<UnboundKnobState>({
  typeName: "UnboundKnob",
  typeSchema: typeSchema,
});
