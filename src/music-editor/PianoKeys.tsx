import { Component, createComputed, createMemo, createSignal, For, Match, on, onCleanup, onMount, Switch } from 'solid-js';
import "./piano-keys.css";
import { ReactiveMap } from '@solid-primitives/map';
import { Vec2 } from '../lib';
import { ReactiveSet } from '@solid-primitives/set';

const PianoKeys: Component<{
  onNoteOn: (name: string) => void,
  onNoteOff: (name: string) => void,
}> = (props) => {
  const notes: { name: string, type: "white" | "black", }[] = [
    { name: 'C', type: 'white' },
    { name: 'C#', type: 'black' },
    { name: 'D', type: 'white' },
    { name: 'D#', type: 'black' },
    { name: 'E', type: 'white' },
    { name: 'F', type: 'white' },
    { name: 'F#', type: 'black' },
    { name: 'G', type: 'white' },
    { name: 'G#', type: 'black' },
    { name: 'A', type: 'white' },
    { name: 'A#', type: 'black' },
    { name: 'B', type: 'white' },
  ];

  const whiteNoteWidth = 50;
  const whiteNoteHeight = 150;
  const blackNoteWidth = 30;
  const blackNoteHeight = 80;

  let pianoDiv!: HTMLDivElement;

  let pointers = new ReactiveMap<number,Vec2>();

  let blackKeys = new ReactiveSet<HTMLDivElement>();

  return (
    <div
      ref={pianoDiv}
      class="piano"
      style={{
        display: "flex",
        "flex-direction": "row",
        "overflow-x": "auto",
        "user-select": "none",
        "touch-action": "none",
      }}
      onPointerDown={(e) => {
        let rect = pianoDiv.getBoundingClientRect();
        pointers.set(
          e.pointerId,
          Vec2.create(
            e.clientX - rect.left,
            e.clientY - rect.top,
          ),
        );
        pianoDiv.setPointerCapture(e.pointerId);
      }}
      onPointerUp={(e) => {
        pointers.delete(e.pointerId);
        pianoDiv.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={(e) => {
        pointers.delete(e.pointerId);
        pianoDiv.releasePointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!pointers.get(e.pointerId)) {
          return;
        }
        let rect = pianoDiv.getBoundingClientRect();
        pointers.set(
          e.pointerId,
          Vec2.create(
            e.clientX - rect.left,
            e.clientY - rect.top,
          ),
        );
      }}
    >
      <For each={notes}>
        {(note) => {
          let [ noteDiv, setNoteDiv ] = createSignal<HTMLDivElement>();
          if (note.type == "black") {
            createComputed(() => {
              let noteDiv2 = noteDiv();
              if (noteDiv2 == undefined) {
                return;
              }
              blackKeys.add(noteDiv2);
              onCleanup(() => blackKeys.delete(noteDiv2));
            });
          }
          let notePressed = createMemo(() => {
            let noteDiv2 = noteDiv();
            if (noteDiv2 == undefined) {
              return false;
            }
            let rect = pianoDiv.getBoundingClientRect();
            let rect2 = noteDiv2.getBoundingClientRect();
            for (let pointer of pointers.values()) {
              let pX = rect.left + pointer.x - rect2.left;
              let pY = rect.top + pointer.y - rect2.top;
              if (0 < pX && pX < rect2.width && 0 < pY && pY < rect2.height) {
                // if pointer is over white key, check that it is not over black key
                if (note.type == "white") {
                  for (let blackKey of blackKeys) {
                    let rect3 = blackKey.getBoundingClientRect();
                    let pX = rect.left + pointer.x - rect3.left;
                    let pY = rect.top + pointer.y - rect3.top;
                    if (0 < pX && pX < rect3.width && 0 < pY && pY < rect3.height) {
                      return false;
                    }
                  }
                }
                return true;
              }
            }
            return false;
          });
          createComputed(on(
            notePressed,
            (notePressed) => {
              if (notePressed) {
                props.onNoteOn(note.name);
              } else {
                props.onNoteOff(note.name);
              }
            },
            { defer: true, },
          ));
          return (
            <Switch>
              <Match when={note.type == "white"}>
                <div
                  ref={setNoteDiv}
                  classList={{
                    "white-key": true,
                    "pressed": notePressed(),
                  }}
                  style={{
                    width: `${whiteNoteWidth}px`,
                    height: `${whiteNoteHeight + (notePressed() ? 2 : 0)}px`,
                    "pointer-events": "none",
                  }}
                />
              </Match>
              <Match when={note.type == "black"}>
                <div
                  ref={setNoteDiv}
                  classList={{
                    "black-key": true,
                    "pressed": notePressed(),
                  }}
                  style={{
                    "margin-left": `${-0.5 * blackNoteWidth-1}px`,
                    "margin-right": `${-0.5 * blackNoteWidth+1}px`,
                    width: `${blackNoteWidth}px`,
                    height: `${blackNoteHeight + (notePressed() ? 2 : 0)}px`,
                    "pointer-events": "none",
                  }}
                />
              </Match>
            </Switch>
          );
        }}
      </For>
    </div>
  );
};

export default PianoKeys;

