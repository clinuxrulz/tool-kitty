import { EcsComponentType } from "../lib";
import { tsObject, TypeSchemaType } from "../TypeSchema";

const typeSchema = tsObject({});

export type FlipXState = TypeSchemaType<typeof typeSchema>;

export const flipXComponentType = new EcsComponentType({
  typeName: "FlipX",
  typeSchema,
});
