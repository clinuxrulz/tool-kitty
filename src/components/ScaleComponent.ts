import { EcsComponentType } from "../ecs/EcsComponent";
import { tsNumber, tsObject, TypeSchemaType } from "../TypeSchema";

const typeSchema = tsObject({
  scale: tsNumber(),
});

export type ScaleState = TypeSchemaType<typeof typeSchema>;

export const scaleComponentType = new EcsComponentType<ScaleState>({
  typeName: "Scale",
  typeSchema,
});
