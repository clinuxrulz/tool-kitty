import { tsNumber, tsObject, tsString, TypeSchemaType } from "../../TypeSchema";

export const pinTypeSchema = tsObject({
  target: tsNumber(),
  pin: tsString(),
});

export type Pin = TypeSchemaType<typeof pinTypeSchema>;
