import { Component, createComputed, createMemo, createSignal, on } from "solid-js";

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
  maxNotes: number,
  numNotes: number,
  notesVertices: Float32Array,
  notesColours: Float32Array,
  notesGLVertexBuffer: WebGLBuffer,
  notesGLColourBuffer: WebGLBuffer,
  notesHead: Note | undefined,
  notesTail: Note | undefined,
  freeNotesHead: Note | undefined,
  freeNotesTail: Note | undefined,
}

const INIT_MAX_NOTES = 10_000;

const Waterfall: Component<{
}> = (props) => {
  let [canvas, setCanvas,] = createSignal<HTMLCanvasElement>();
  let gl = createMemo(on(
    canvas,
    (canvas) => {
      if (canvas == undefined) {
        return undefined;
      }
      let gl = canvas.getContext("webgl");
      if (gl == null) {
        return undefined;
      }
      return gl;
    },
  ));
  createComputed(on(
    gl,
    (gl) => {
      if (gl == undefined) {
        return;
      }
      useGl(gl);
    },
  ));
  return (
    <canvas ref={setCanvas} style={{ "width": "100%", "height": "100%", }} />
  );
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

function initGL(gl: WebGLRenderingContext): NotesGLState {
  let state: NotesGLState = {
    maxNotes: INIT_MAX_NOTES,
    numNotes: 0,
    notesVertices: new Float32Array(INIT_MAX_NOTES * 2 * 6),
    notesColours: new Float32Array(INIT_MAX_NOTES * 4),
    notesGLVertexBuffer: gl.createBuffer(),
    notesGLColourBuffer: gl.createBuffer(),
    notesHead: undefined,
    notesTail: undefined,
    freeNotesHead: undefined,
    freeNotesTail: undefined,
  };
  for (let i = 0; i < INIT_MAX_NOTES; ++i) {
    let note: Note = {
      startTime: 0.0,
      holdTime: 0.0,
      note: 0.0,
      colourR: 0.0,
      colourG: 0.0,
      colourB: 0.0,
      colourA: 0.0,
      isAlive: false,
      prev: undefined!,
      next: undefined,
    };
    note.prev = note;
    freeNote(state, note);
  }
  return state;
}

function drawGl(gl: WebGLRenderingContext, state: NotesGLState) {
  let i = 0;
  let j = 0;
  let at = state.notesHead;
  while (at != undefined) {
    let x1 = 0.0;
    let y1 = 0.0;
    let x2 = 0.0;
    let y2 = 0.0;
    let x3 = 0.0;
    let y3 = 0.0;
    let x4 = 0.0;
    let y4 = 0.0;
    state.notesVertices[i++] = x1;
    state.notesVertices[i++] = x1;
    state.notesVertices[i++] = x2;
    state.notesVertices[i++] = x2;
    state.notesVertices[i++] = x3;
    state.notesVertices[i++] = x3;
    state.notesVertices[i++] = x1;
    state.notesVertices[i++] = x1;
    state.notesVertices[i++] = x3;
    state.notesVertices[i++] = x3;
    state.notesVertices[i++] = x4;
    state.notesVertices[i++] = x4;
    state.notesColours[j++] = at.colourR;
    state.notesColours[j++] = at.colourG;
    state.notesColours[j++] = at.colourB;
    state.notesColours[j++] = at.colourA;
    at = at.next;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, state.notesGLColourBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, state.notesColours);
}

function useGl(gl: WebGLRenderingContext) {
  const vsSource = `
        attribute vec4 a_position;
        void main() {
            gl_Position = a_position;
        }
    `;
  const fsSource = `
        precision mediump float;
        void main() {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); // Solid Red (R, G, B, A)
        }
    `;
  const program = initShaderProgram(gl, vsSource, fsSource);
  if (program == undefined) {
    return;
  }
  gl.useProgram(program);
  const vertices = new Float32Array([
    0.0, 0.5,
    -0.5, -0.5,
    0.5, -0.5
  ]);
  const vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
  const positionAttributeLocation = gl.getAttribLocation(program, 'a_position');
  gl.vertexAttribPointer(
    positionAttributeLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );
  gl.enableVertexAttribArray(positionAttributeLocation);
  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  const vertexCount = 3;
  gl.drawArrays(gl.TRIANGLES, 0, vertexCount);
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

export default Waterfall;
