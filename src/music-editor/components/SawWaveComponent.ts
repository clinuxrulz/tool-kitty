import { tsObject, TypeSchemaType } from "../../TypeSchema";
import { EcsComponentType } from "./../../ecs/EcsComponent";

const typeSchema = tsObject({});

export type SawWaveState = TypeSchemaType<typeof typeSchema>;

export const sawWaveComponentType = new EcsComponentType({
  typeName: "SawWave",
  typeSchema,
});
