import { tsObject, tsString, TypeSchemaType } from "../../TypeSchema";

export const pinTypeSchema = tsObject({
  target: tsString(),
  pin: tsString(),
});

export type Pin = TypeSchemaType<typeof pinTypeSchema>;
