import { EcsComponentType } from "tool-kitty-ecs";
import { tsArray, tsObject, TypeSchemaType } from "tool-kitty-type-schema";
import { pinTypeSchema } from "tool-kitty-node-editor";

const typeSchema = tsObject({
  out: tsArray(pinTypeSchema),
});

export type KnobState = TypeSchemaType<typeof typeSchema>;

export const knobComponentType = new EcsComponentType<KnobState>({
  typeName: "Knob",
  typeSchema,
});
