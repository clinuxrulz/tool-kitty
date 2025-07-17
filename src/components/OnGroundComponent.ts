import { EcsComponentType } from "../lib";
import { tsObject, TypeSchemaType } from "../TypeSchema";

const typeSchema = tsObject({});

export type OnGroundState = TypeSchemaType<typeof typeSchema>;

export const onGroundComponentType = new EcsComponentType({
  typeName: "OnGround",
  typeSchema,  
});
