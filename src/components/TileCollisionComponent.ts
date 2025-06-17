import { EcsComponentType } from "../ecs/EcsComponent";
import { makeInvariantTypeSchema, TypeSchema } from "../TypeSchema";

export type TileCollisionState = {
  textureAtlasFilename: string;
  frameName: string;
  width: number;
  height: number;
  /** metaData is a json value */
  metaData: any;
};

const jsonTypeSchema: TypeSchema<any> = makeInvariantTypeSchema<any, string>(
  (a: string) => JSON.parse(a),
  (a: any) => JSON.stringify(a),
  "String",
);

export const tileCollisionComponentType =
  new EcsComponentType<TileCollisionState>({
    typeName: "TileCollision",
    typeSchema: {
      type: "Object",
      properties: {
        textureAtlasFilename: "String",
        frameName: "String",
        width: "Number",
        height: "Number",
        metaData: jsonTypeSchema,
      },
    },
  });
