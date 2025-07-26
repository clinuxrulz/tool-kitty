import { tsArray, tsNumber, tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "../../ecs/EcsComponent";
import { pinTypeSchema } from "./Pin";

const typeSchema = tsObject({
  value: tsNumber(),
  out: tsArray(pinTypeSchema),
});

export type NumberState = TypeSchemaType<typeof typeSchema>;

export const numberComponentType = new EcsComponentType({
  typeName: "Number",
  typeSchema,
});
