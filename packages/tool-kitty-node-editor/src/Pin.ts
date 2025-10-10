import { tsObject, tsString, TypeSchemaType } from "tool-kitty-type-schema";

export const pinTypeSchema = tsObject({
  target: tsString(),
  pin: tsString(),
});

export type Pin = TypeSchemaType<typeof pinTypeSchema>;
