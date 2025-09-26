import { Midi } from "@tonejs/midi";
import { Complex, EcsComponent, EcsWorld, Transform2D, transform2DComponentType, Vec2 } from "../lib";
import { delayComponentType } from "./components/DelayComponent";
import { startComponentType } from "./components/StartComponent";
import { Pin } from "./components/Pin";
import { numberComponentType, NumberState } from "./components/NumberComponent";
import { setVariableComponentType } from "./components/SetVariableComponent";
import { variableComponentType } from "./components/VariableComponent";
import { meowComponentType } from "./components/MeowComponent";
import { speakerComponentType } from "./components/SpeakerComponent";

export async function importMidi(world: EcsWorld, file: File) {
  type Event = {
    time: number,
    type: "NoteOn" | "NoteOff",
    note: number,
  };
  let events: Event[] = [];
  let midi = new Midi(await file.arrayBuffer());
  for (let track of midi.tracks) {
    for (let note of track.notes) {
      events.push({
        time: note.time,
        type: "NoteOn",
        note: note.midi,
      });
      events.push({
        time: note.time + note.duration,
        type: "NoteOff",
        note: note.midi,
      });
    }
  }
  events.sort((a, b) => a.time - b.time);
  let limit = 1000;
  let usedNotesSet = new Set<number>();
  let events2 = new Map<number,Event[]>();
  let idx = 0;
  for (let event of events) {
    let events3 = events2.get(event.time);
    if (events3 == undefined) {
      events3 = [ event, ];
      events2.set(event.time, events3);
    } else {
      events3.push(event);
    }
    usedNotesSet.add(event.note);
    ++idx;
    if (idx >= limit) {
      break;
    }
  }
  let atTime = 0.0;
  let atX = 0.0;
  let prev: Pin;
  let assignNextOfPrev: (x: Pin) => void;
  {
    let c = startComponentType.create({
      next: [],
    });
    assignNextOfPrev = (x) => {
      c.setState("next", (n) => [ ...n, x, ]);
    };
    let id = world.createEntity([
      c,
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(atX, 0.0),
          Complex.rot0,
        )
      }),
    ]);
    prev = {
      target: id,
      pin: "next",
    };
  }
  atX += 200.0;
  let notes: {
    id: string,
    c: EcsComponent<NumberState>
  }[] = [];
  let zero: {
    id: string,
    c: EcsComponent<NumberState>,
  };
  let atY = -200;
  for (let i = 21; i <= 108; ++i) {
    if (!usedNotesSet.has(i)) {
      continue;
    }
    let freq = 261.63 * Math.pow(2, (i-60)/12.0);
    let c = numberComponentType.create({
      value: freq,
      out: [],
    });
    let id = world.createEntity([
      c,
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(atX, atY),
          Complex.rot0,
        ),
      }),
    ]);
    notes[i] = { id, c, };
    atY -= 100.0;
  }
  {
    let c = numberComponentType.create({
      value: 0.0,
      out: [],
    });
    let id = world.createEntity([
      c,
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(atX, atY),
          Complex.rot0,
        ),
      }),
    ]);
    zero = { id, c, };
  }
  for (let i = 21; i <= 108; ++i) {
    if (!usedNotesSet.has(i)) {
      continue;
    }
    let c1 = variableComponentType.create({
      id: `n${i}`,
      value: [],
    });
    let id1 = world.createEntity([
      c1,
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(atX, atY),
          Complex.rot0,
        ),
      }),
    ]);
    let c2 = meowComponentType.create({
      frequency: {
        target: id1,
        pin: "value",
      },
      out: [],
    });
    let n2 = world.createEntity([
      c2,
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(atX + 150, atY),
          Complex.rot0,
        ),
      }),
    ]);
    c1.setState(
      "value",
      [
        {
          target: n2,
          pin: "frequency",
        },
      ],
    );
    let c3 = speakerComponentType.create({
      in: {
        target: n2,
        pin: "out",
      },
    });
    let n3 = world.createEntity([
      c3,
      transform2DComponentType.create({
        transform: Transform2D.create(
          Vec2.create(atX + 300.0, atY),
          Complex.rot0,
        ),
      }),
    ]);
    c2.setState(
      "out",
      [
        {
          target: n3,
          pin: "in",
        },
      ],
    );
    atY -= 100.0;
  }
  for (let [ time, events, ] of events2.entries()) {
    let delay = time - atTime;
    atTime = time;
    {
      let c = delayComponentType.create({
        prev,
        delay: undefined,
        next: [],
      });
      assignNextOfPrev = (x) => {
        c.setState("next", (n) => [ ...n, x, ]);
      };
      let id = world.createEntity([
        c,
        transform2DComponentType.create({
          transform: Transform2D.create(
            Vec2.create(atX, 0.0),
            Complex.rot0,
          )
        }),
      ]);
      let delayValueId = world.createEntity([
        numberComponentType.create({
          value: delay * 1000.0,
          out: [
            {
              target: id,
              pin: "delay",
            },
          ],
        }),
        transform2DComponentType.create({
          transform: Transform2D.create(
            Vec2.create(
              atX,
              -100.0,
            ),
            Complex.rot0,
          ),
        }),
      ]);
      c.setState("delay", {
        target: delayValueId,
        pin: "out",
      });
      prev = {
        target: id,
        pin: "next",
      };
      let atY = -250.0;
      for (let event of events) {
        let val: number;
        if (event.type == "NoteOn") {
          val = 261.63 * Math.pow(2, (event.note - 128) / 12.0);
        } else {
          val = 0.0;
        }
        let c = setVariableComponentType.create({
          id: `n${event.note}`,
          prev: { ...prev, },
          value: undefined,
          next: [],
        });
        let id = world.createEntity([
          c,
          transform2DComponentType.create({
            transform: Transform2D.create(
              Vec2.create(
                atX,
                atY,
              ),
              Complex.rot0,
            ),
          }), 
        ]);
        if (event.type == "NoteOn") {
          let note = notes[event.note];
          note.c.setState("out", (out) => [ ...out, { target: id, pin: "value", }, ]);
          c.setState("value", { target: note.id, pin: "out", });
        } else {
          zero.c.setState("out", (out) => [ ...out, { target: id, pin: "value", }, ]);
          c.setState("value", { target: zero.id, pin: "out", });
        }
        assignNextOfPrev({
          target: id,
          pin: "prev",
        });
        atY -= 200.0;
      }
    }
    atX += 200.0;
    limit -= events.length;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    if (limit <= 0) {
      break;
    }
  }
}
