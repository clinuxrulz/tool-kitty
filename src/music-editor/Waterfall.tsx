import { Component, createComputed, createEffect, createMemo, createSignal, on } from "solid-js";
import { Midi } from "@tonejs/midi";

type Note = {
  startTime: number,
  holdTime: number,
  note: number,
  colourR: number,
  colourG: number,
  colourB: number,
  colourA: number,
  isAlive: boolean,
  prev: Note,
  next: Note | undefined,
};

type NotesGLState = {
  width: number,
  height: number,
  time: number,
  fallSpeed: number,
  maxNotes: number,
  numNotes: number,
  notesVertices: Float32Array,
  notesGLVertexBuffer: WebGLBuffer,
  notesHead: Note | undefined,
  notesTail: Note | undefined,
  freeNotesHead: Note | undefined,
  freeNotesTail: Note | undefined,
  visibleNotesStart: Note | undefined,
  visibleNotesEnd: Note | undefined,
  numVisibleNotes: number,
  program: WebGLProgram | undefined,
}

const INIT_MAX_NOTES = 10_000;

const Waterfall: Component<{
}> = (props) => {
  let [canvas, setCanvas,] = createSignal<HTMLCanvasElement>();
  let [ gl, setGl, ] = createSignal<WebGLRenderingContext>();
  createEffect(on(
    canvas,
    (canvas) => {
      if (canvas == undefined) {
        return undefined;
      }
      setGl(canvas.getContext("webgl") ?? undefined);
    },
  ));
  let glState = createMemo(on(
    [ gl, canvas, ],
    ([ gl, canvas, ]) => {
      if (gl == undefined) {
        return undefined;
      }
      if (canvas == undefined) {
        return undefined;
      }
      return initGL(gl, canvas);
    },
  ));
  let [ fileInputElement, setFileInputElement ] = createSignal<HTMLInputElement>();
  let running = false;
  let firstUpdate = true;
  let t0 = 0.0;
  let update = (t: number) => {
    let gl2 = gl();
    if (gl2 == undefined) {
      return;
    }
    let glState2 = glState();
    if (glState2 == undefined) {
      return;
    }
    if (firstUpdate) {
      t0 = t;
      firstUpdate = false;
    }
    if (!running) {
      return;
    }
    let time = t - t0;
    glState2.time = time;
    updateWindow(glState2);
    drawGl(gl2, glState2);
    requestAnimationFrame(update);
  };
  let run = () => {
    running = true;
    firstUpdate = true;
    requestAnimationFrame(update);
  };
  return (
    <div
      style={{
        "width": "100%",
        "height": "100%",
        "display": "flex",
        "flex-direction": "column",
      }}
    >
      <div>
        <button
          class="btn btn-primary"
          onClick={() => {
            fileInputElement()?.click();
          }}
        >
          Import Midi
        </button>
        <input
          ref={setFileInputElement}
          type="file"
          hidden
          onChange={(e) => {
            let glState2 = glState();
            if (glState2 == undefined) {
              return;
            }
            let files = e.currentTarget.files;
            if (files == null || files.length == 0) {
              return;
            }
            let file = files[0];
            importMidi(glState2, file);
            e.currentTarget.value = "";
          }}
        />
        <button
          class="btn btn-primary"
          onClick={() => run()}
        >
          Run
        </button>
      </div>
      <canvas
        ref={setCanvas}
        style={{
          "flex-grow": "1",
        }}
      />
    </div>
  );
}

async function importMidi(state: NotesGLState, file: File) {
  let midi = new Midi(await file.arrayBuffer());
  let notes: Note[] = [];
  for (let track of midi.tracks) {
    let colour = generateRandomBrightColour();
    for (let note of track.notes) {
      let note2: Note = {
        startTime: note.time * 1000.0,
        holdTime: note.duration * 1000.0,
        note: note.midi,
        colourR: colour.r,
        colourG: colour.g,
        colourB: colour.b,
        colourA: 1.0,
        isAlive: false,
        prev: undefined!,
        next: undefined,
      };
      note2.prev = note2;
      notes.push(note2);
    }
  }
  notes.sort((a,b) => a.startTime - b.startTime);
  for (let note of notes) {
    insertNote(state, note);
  }
}

function insertNote(state: NotesGLState, note: Note) {
  if (state.notesHead == undefined) {
    state.notesHead = state.notesTail = note;
  } else {
    let tail = state.notesTail!;
    tail.next = note;
    note.prev = tail;
    state.notesTail = note;
  }
}

function updateWindow(state: NotesGLState) {
  let tMin = state.time - state.height / state.fallSpeed;
  let tMax = state.time;
  let atNote = state.visibleNotesEnd?.next ?? state.notesHead;
  while (atNote != undefined) {
    if (atNote.startTime >= tMax) {
      break;
    }
    if (state.visibleNotesEnd == undefined) {
      state.visibleNotesStart = state.visibleNotesEnd = atNote;
    } else {
      state.visibleNotesEnd = atNote;
    }
    state.numVisibleNotes++;
    atNote = atNote.next;
  }
  atNote = state.visibleNotesStart;
  while (true) {
    if (atNote == undefined) {
      state.numVisibleNotes = 0;
      state.visibleNotesStart = state.visibleNotesEnd = undefined;
      break;
    }
    if (atNote.startTime + atNote.holdTime <= tMin) {
      state.numVisibleNotes--;
      atNote = atNote.next;
      state.visibleNotesStart = atNote;
      continue;
    }
    break;
  }
}

function allocNote(state: NotesGLState): Note {
  if (state.freeNotesTail == undefined) {
    // Error for now, but I will make it a warning later
    throw new Error("INIT_MAX_NOTES too small");
  }
  let note = state.freeNotesTail;
  if (state.freeNotesTail == state.freeNotesHead) {
    state.freeNotesHead = state.freeNotesTail = undefined;
  } else {
    state.freeNotesTail = state.freeNotesTail.prev;
    state.freeNotesTail.next = undefined;
  }
  note.isAlive = true;
  if (state.notesHead == undefined) {
    note.prev = note;
    state.notesHead = state.notesTail = note;
  } else {
    let tail = state.notesTail!;
    tail.next = note;
    note.prev = tail;
  }
  state.numNotes++;
  return note;
}

function freeNote(state: NotesGLState, note: Note) {
  if (note.isAlive) {
    let prev = note.prev;
    let next = note.next;
    prev.next = next;
    if (next != undefined) {
      next.prev = prev;
    }
  }
  note.next = undefined;
  note.isAlive = false;
  if (state.freeNotesHead == undefined) {
    note.prev = note;
    state.freeNotesHead = state.freeNotesTail = note;
  } else {
    let tail = state.freeNotesTail!;
    tail.next = note;
    note.prev = tail;
  }
  state.numNotes--;
}

function initGL(gl: WebGLRenderingContext, canvas: HTMLCanvasElement): NotesGLState | undefined {
  let rect = canvas.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;
  let state: NotesGLState = {
    width: canvas.width,
    height: canvas.height,
    time: 0.0,
    fallSpeed: 1.0,
    maxNotes: INIT_MAX_NOTES,
    numNotes: 0,
    notesVertices: new Float32Array(INIT_MAX_NOTES * (2 + 4 + 2) * 6),
    notesGLVertexBuffer: gl.createBuffer(),
    notesHead: undefined,
    notesTail: undefined,
    freeNotesHead: undefined,
    freeNotesTail: undefined,
    visibleNotesStart: undefined,
    visibleNotesEnd: undefined,
    numVisibleNotes: 0,
    program: undefined,
  };
  for (let i = 0, j = 0; i < INIT_MAX_NOTES; ++i) {
    state.notesVertices[j + 6] = 0.0;
    state.notesVertices[j + 7] = 0.0;
    j += (2 + 4 + 2);
    state.notesVertices[j + 6] = 1.0;
    state.notesVertices[j + 7] = 0.0;
    j += (2 + 4 + 2);
    state.notesVertices[j + 6] = 1.0;
    state.notesVertices[j + 7] = 1.0;
    j += (2 + 4 + 2);
    state.notesVertices[j + 6] = 0.0;
    state.notesVertices[j + 7] = 0.0;
    j += (2 + 4 + 2);
    state.notesVertices[j + 6] = 1.0;
    state.notesVertices[j + 7] = 1.0;
    j += (2 + 4 + 2);
    state.notesVertices[j + 6] = 0.0;
    state.notesVertices[j + 7] = 1.0;
    j += (2 + 4 + 2);
  }
  const vertexShader = `
    attribute vec4 aVertexPosition;
    attribute vec4 aColour;
    attribute vec2 aTextureCoord;

    uniform mat4 uModelViewMatrix;

    varying highp vec4 vColour;
    varying highp vec2 vTextureCoord;

    void main(void) {
        gl_Position = uModelViewMatrix * aVertexPosition;
        vTextureCoord = aTextureCoord;
        vColour = aColour;
    }
  `;
  const fragmentShader = `
    varying highp vec4 vColour;
    varying highp vec2 vTextureCoord;

    void main(void) {
        gl_FragColor = vColour;
    }
  `;
  const program = initShaderProgram(
    gl,
    vertexShader,
    fragmentShader
  );
  if (program == undefined) {
    return undefined;
  }
  state.program = program;
  gl.useProgram(program);
  const modelViewMatrixLocation = gl.getUniformLocation(program, "uModelViewMatrix");
  function createOrtho2D(left: number, right: number, bottom: number, top: number) {
      var near = -1, far = 1, rl = right-left, tb = top-bottom, fn = far-near;
      return [        2/rl,               0,              0,  0,
                        0,             2/tb,              0,  0,
                        0,                0,          -2/fn,  0,
          -(right+left)/rl, -(top+bottom)/tb, -(far+near)/fn,  1];
  }
  const modelViewMatrix = new Float32Array(
    createOrtho2D(
      0.0,
      state.width,
      0.0,
      state.height,
    ),
  );
  gl.uniformMatrix4fv(
    modelViewMatrixLocation,
    false,
    modelViewMatrix,
  );
  const positionLocation = gl.getAttribLocation(program, 'aVertexPosition');
  const colourLocation = gl.getAttribLocation(program, "aColour");
  const textureCoordLocation = gl.getAttribLocation(program, 'aTextureCoord');
  gl.bindBuffer(gl.ARRAY_BUFFER, state.notesGLVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, state.notesVertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(
    positionLocation,
    2,
    gl.FLOAT,
    false,
    (2 + 4 + 2) * 4,
    0 * 4,
  );
  gl.vertexAttribPointer(
    colourLocation,
    4,
    gl.FLOAT,
    false,
    (2 + 4 + 2) * 4,
    4 * 4,
  );
  gl.vertexAttribPointer(
    textureCoordLocation,
    2,
    gl.FLOAT,
    false,
    (2 + 4 + 2) * 4,
    6 * 4,
  );
  gl.enableVertexAttribArray(positionLocation);
  gl.enableVertexAttribArray(colourLocation);
  gl.enableVertexAttribArray(textureCoordLocation);
  gl.viewport(0, 0, canvas.width, canvas.height);
  return state;
}

function drawGl(gl: WebGLRenderingContext, state: NotesGLState) {
  let i = 0;
  let at = state.visibleNotesStart;
  let noteStartX = 0.0;
  let noteStepX = state.width / 88.0;
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  while (at != state.visibleNotesEnd?.next && at != undefined) {
    let noteCount = 0;
    while (at != state.visibleNotesEnd?.next && at != undefined) {
      let x1 = noteStartX + (at.note - 21) * noteStepX;
      let y1 = state.height - (state.time - at.startTime) * state.fallSpeed;
      let x2 = x1 + noteStepX;
      let y2 = y1;
      let x3 = x2;
      let y3 = y2 + at.holdTime * state.fallSpeed;
      let x4 = x1;
      let y4 = y3;
      state.notesVertices[i + 0] = x1;
      state.notesVertices[i + 1] = y1;
      state.notesVertices[i + 2] = at.colourR;
      state.notesVertices[i + 3] = at.colourG;
      state.notesVertices[i + 4] = at.colourB;
      state.notesVertices[i + 5] = at.colourA;
      i += (2 + 4 + 2);
      state.notesVertices[i + 0] = x2;
      state.notesVertices[i + 1] = y2;
      state.notesVertices[i + 2] = at.colourR;
      state.notesVertices[i + 3] = at.colourG;
      state.notesVertices[i + 4] = at.colourB;
      state.notesVertices[i + 5] = at.colourA;
      i += (2 + 4 + 2);
      state.notesVertices[i + 0] = x3;
      state.notesVertices[i + 1] = y3;
      state.notesVertices[i + 2] = at.colourR;
      state.notesVertices[i + 3] = at.colourG;
      state.notesVertices[i + 4] = at.colourB;
      state.notesVertices[i + 5] = at.colourA;
      i += (2 + 4 + 2);
      state.notesVertices[i + 0] = x1;
      state.notesVertices[i + 1] = y1;
      state.notesVertices[i + 2] = at.colourR;
      state.notesVertices[i + 3] = at.colourG;
      state.notesVertices[i + 4] = at.colourB;
      state.notesVertices[i + 5] = at.colourA;
      i += (2 + 4 + 2);
      state.notesVertices[i + 0] = x3;
      state.notesVertices[i + 1] = y3;
      state.notesVertices[i + 2] = at.colourR;
      state.notesVertices[i + 3] = at.colourG;
      state.notesVertices[i + 4] = at.colourB;
      state.notesVertices[i + 5] = at.colourA;
      i += (2 + 4 + 2);
      state.notesVertices[i + 0] = x4;
      state.notesVertices[i + 1] = y4;
      state.notesVertices[i + 2] = at.colourR;
      state.notesVertices[i + 3] = at.colourG;
      state.notesVertices[i + 4] = at.colourB;
      state.notesVertices[i + 5] = at.colourA;
      i += (2 + 4 + 2);
      at = at.next;
      ++noteCount;
      if (noteCount >= INIT_MAX_NOTES) {
        break;
      }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, state.notesGLVertexBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, state.notesVertices.subarray(0, noteCount * 8 * 6));
    gl.drawArrays(gl.TRIANGLES, 0, noteCount * 6);
  }
}

function loadShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (shader == null) {
    return undefined;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return undefined;
  }
  return shader;
}

function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (vertexShader == undefined || fragmentShader == undefined) {
    return undefined;
  }
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return undefined;
  }
  return shaderProgram;
}

interface RGBColour {
  r: number;
  g: number;
  b: number;
}

function hsvToRgb(h: number, s: number, v: number): RGBColour {
  let r: number, g: number, b: number;
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
      case 0: r = v; g = t; b = p; break;
      case 1: r = q; g = v; b = p; break;
      case 2: r = p; g = v; b = t; break;
      case 3: r = p; g = q; b = v; break;
      case 4: r = t; g = p; b = v; break;
      case 5: r = v; g = p; b = q; break;
      default: r = 0; g = 0; b = 0; break;
  }
  return { r, g, b };
}

function generateRandomBrightColour(): RGBColour {
    const h = Math.random();
    const s = Math.random() * (1.0 - 0.7) + 0.7; 
    const v = 1.0; 
   return hsvToRgb(h, s, v);
}

export default Waterfall;
