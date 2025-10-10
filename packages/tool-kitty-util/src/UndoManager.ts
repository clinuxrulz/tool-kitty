import { Accessor, batch, createMemo, createSignal, Setter } from "solid-js";

export type UndoUnit = {
  displayName: string;
  run(isUndo: boolean): void;
};

export class UndoManager {
  readonly canUndo: Accessor<boolean>;
  readonly canRedo: Accessor<boolean>;
  readonly undoDisplayName: Accessor<string | undefined>;
  readonly redoDisplayName: Accessor<string | undefined>;
  readonly undo: () => void;
  readonly redo: () => void;
  readonly pushUndoUnit: (undoUnit: UndoUnit) => void;
  readonly clear: () => void;

  constructor() {
    /**
     * This stack holds all the undo and all the redo units.
     * Example Stage: (u is undo, r is redo)
     * stack = [ u, u, r, r, ]
     * stackPos = 1
     */
    let stack: UndoUnit[] = [];
    /**
     * This variable points to the undo position in the stack.
     */
    let stackPos = -1;
    let [canUndo, setCanUndo] = createSignal(false);
    let [canRedo, setCanRedo] = createSignal(false);
    let [undoDisplayName, setUndoDisplayName] = createSignal<string>();
    let [redoDisplayName, setRedoDisplayName] = createSignal<string>();
    let updateSignals = () => {
      batch(() => {
        setCanUndo(() => stackPos != -1);
        setCanRedo(() => stackPos < stack.length - 1);
        if (stackPos != -1) {
          let undo = stack[stackPos];
          setUndoDisplayName(undo.displayName);
        } else {
          setUndoDisplayName(undefined);
        }
        if (stackPos < stack.length - 1) {
          let redo = stack[stackPos + 1];
          setRedoDisplayName(redo.displayName);
        } else {
          setRedoDisplayName(undefined);
        }
      });
    };
    let undo = () => {
      if (stackPos == -1) {
        return;
      }
      let undo = stack[stackPos];
      undo.run(true);
      --stackPos;
      updateSignals();
    };
    let redo = () => {
      if (stackPos >= stack.length - 1) {
        return;
      }
      ++stackPos;
      let redo = stack[stackPos];
      redo.run(false);
      updateSignals();
    };
    let pushUndoUnit = (undoUnit: UndoUnit) => {
      if (stackPos < stack.length - 1) {
        stack.splice(stackPos + 1, stack.length - 1 - stackPos);
      }
      ++stackPos;
      stack.push(undoUnit);
      updateSignals();
    };
    this.clear = () => {
      stack.splice(0, stack.length);
      stackPos = -1;
      updateSignals();
    };
    //
    this.canUndo = canUndo;
    this.canRedo = canRedo;
    this.undoDisplayName = undoDisplayName;
    this.redoDisplayName = redoDisplayName;
    this.undo = undo;
    this.redo = redo;
    this.pushUndoUnit = pushUndoUnit;
  }
}
