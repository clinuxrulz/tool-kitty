import { EcsComponentType } from "../../lib";
import { tsArray, tsObject, TypeSchemaType } from "../../TypeSchema";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  next: tsArray(pinTypeSchema),
});

export type StartState = TypeSchemaType<typeof typeSchema>;

export const startComponentType = new EcsComponentType({
  typeName: "Start",
  typeSchema,
});
