import { describe, expect, it } from "vitest";
import { createMemo, createRoot, createSignal } from ".";

describe("test", () => {
  it("tests a test", () => {
    let [ x, setX, ] = createSignal(2);
    createRoot((dispose) => {
      let y = createMemo(() => x() * 2);
      expect(y()).toBe(4);
      setX(4);
      expect(y()).toBe(8);
      dispose();
    });
  });
});
