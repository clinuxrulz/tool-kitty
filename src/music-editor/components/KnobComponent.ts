import { EcsComponentType } from "../../lib";
import { tsArray, tsObject, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  out: tsArray(pinTypeSchema),
});

export type KnobState = TypeSchemaType<typeof typeSchema>;

export const knobComponentType = new EcsComponentType({
  typeName: "Knob",
  typeSchema,
});
