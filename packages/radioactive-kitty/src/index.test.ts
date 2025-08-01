import { describe, expect, it } from "vitest";
import { createEffect, createMemo, createRoot, createSelector, createSignal, untrack } from ".";

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

describe("tests createSelector", () => {
  it("should select stuff when the selection changes", () => {
    let items: { selected: boolean, }[] = [];
    let [ selection, setSelection, ] = createSignal(0);
    createRoot((dispose) => {
      let isSelected = createSelector(selection);
      for (let i = 0; i < 10; ++i) {
        let item = {
          selected: false,
        };
        items.push(item);
        createEffect(() => {
          item.selected = isSelected(i);
        });
      }
      for (let i = 0; i < items.length; ++i) {
        setSelection(i);
        for (let j = 0; j < items.length; ++j) {
          expect(items[j].selected).toBe(j == i);
        }
      }
      dispose();
    });
  });
});
