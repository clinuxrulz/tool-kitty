import { Component, createComputed, createEffect, createMemo, createSignal, on } from "solid-js";
import { Midi } from "@tonejs/midi";
import { SoundFont2, Preset, Sample, Instrument } from "soundfont2";
import musicAudioWorkletProcessorUrl from "./music-audio-worklet-processor?worker&url";
import { type NoteEvent } from "./music-audio-worklet-processor";
import keysVertexShaderCode from "./shaders/keys.vert.glsl?raw";
import keysFragmentShaderCode from "./shaders/keys.frag.glsl?raw";

const FOV_Y = 50.0;

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
  positionLocation: number,
  colourLocation: number,
  textureCoordLocation: number,
  pianoVertices: Float32Array,
  pianoGLVertexBuffer: WebGLBuffer,
  pianoProgram: WebGLProgram | undefined,
  pianoPositionLocation: number,
}

const INIT_MAX_NOTES = 10_000;

const Waterfall: Component<{
}> = (props) => {
  let [ canvasDiv, setCanvasDiv, ] = createSignal<HTMLDivElement>();
  let [canvas, setCanvas,] = createSignal<HTMLCanvasElement>();
  let [ gl, setGl, ] = createSignal<WebGLRenderingContext>();
  createEffect(on(
    [ canvasDiv, canvas, ],
    ([ canvasDiv, canvas, ]) => {
      if (canvasDiv == undefined || canvas == undefined) {
        return undefined;
      }
      let rect = canvasDiv.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.setProperty("width", `${rect.width}px`);
      canvas.style.setProperty("height", `${rect.height}px`);
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
  let run = async () => {
    let glState2 = glState();
    if (glState2 == undefined) {
      return;
    }
    let [ audioCtx, workletNode, ] = await startAudio();
    let noteEvents: NoteEvent[] = [];
    let note = glState2.notesHead;
    let nextId = 0;
    while (note != undefined) {
      let id = nextId++;
      noteEvents.push({
        id,
        time: (note.startTime) * 0.001,
        note: note.note,
        type: "On",
      });
      noteEvents.push({
        id,
        time: (note.startTime + note.holdTime) * 0.001,
        note: note.note,
        type: "Off",
      });
      note = note.next;
    }
    noteEvents.sort((a, b) => {
      let x = a.time - b.time;
      if (x != 0.0) {
        return x;
      }
      x = a.note - b.note;
      if (x != 0.0) {
        return x;
      }
      if (a.type == b.type) {
        return 0.0;
      }
      if (a.type == "Off") {
        return -1.0;
      } else {
        return 1.0;
      }
    });
    workletNode.port.postMessage({
      type: "musicData",
      params: {
        noteEvents,
      },
    });
    running = true;
    firstUpdate = true;
    requestAnimationFrame(update);
  };
  return (
    <div
      style={{
        "flex-grow": "1",
        "display": "flex",
        "flex-direction": "column",
        "overflow": "hidden",
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
      <div
        style={{
          "flex-grow": "1",
        }}
        ref={setCanvasDiv}
      >
        <canvas ref={setCanvas}/>
      </div>
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
  //let rect = canvas.getBoundingClientRect();
  //canvas.width = rect.width;
  //canvas.height = rect.height;
  const focalLength = 0.5 * canvas.height / Math.tan(0.5 * FOV_Y * Math.PI / 180.0);
  let state: NotesGLState = {
    width: canvas.width,
    height: canvas.height,
    time: 0.0,
    fallSpeed: 0.5,
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
    positionLocation: -1,
    colourLocation: -1,
    textureCoordLocation: -1,
    pianoVertices: new Float32Array(12),
    pianoGLVertexBuffer: gl.createBuffer(),
    pianoProgram: undefined,
    pianoPositionLocation: -1,
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
  const pianoProgram = initShaderProgram(
    gl,
    keysVertexShaderCode,
    keysFragmentShaderCode,
  );
  if (pianoProgram == undefined) {
    return undefined;
  }
  state.program = program;
  state.pianoProgram = pianoProgram;
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
  state.positionLocation = gl.getAttribLocation(program, 'aVertexPosition');
  state.colourLocation = gl.getAttribLocation(program, "aColour");
  state.textureCoordLocation = gl.getAttribLocation(program, 'aTextureCoord');
  gl.bindBuffer(gl.ARRAY_BUFFER, state.notesGLVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, state.notesVertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(
    state.positionLocation,
    2,
    gl.FLOAT,
    false,
    (2 + 4 + 2) * 4,
    0 * 4,
  );
  gl.vertexAttribPointer(
    state.colourLocation,
    4,
    gl.FLOAT,
    false,
    (2 + 4 + 2) * 4,
    4 * 4,
  );
  gl.vertexAttribPointer(
    state.textureCoordLocation,
    2,
    gl.FLOAT,
    false,
    (2 + 4 + 2) * 4,
    6 * 4,
  );
  gl.useProgram(pianoProgram);
  const pianoModelViewMatrixLocation = gl.getUniformLocation(pianoProgram, "uModelViewMatrix");
  gl.uniformMatrix4fv(
    pianoModelViewMatrixLocation,
    false,
    modelViewMatrix,
  );
  const uFocalLengthLocation = gl.getUniformLocation(pianoProgram, "uFocalLength");
  gl.uniform1f(
    uFocalLengthLocation,
    focalLength,
  );
  const resolutionLocation = gl.getUniformLocation(pianoProgram, "resolution");
  const uOffsetYLocations = gl.getUniformLocation(pianoProgram, "uOffsetY");
  let pianoHeight: number;
  {
    let d = 52.0 * 200.0 * focalLength / state.width;
    let wy = -1.0;
    let wz = 3.0;
    let wm = Math.sqrt(wy*wy + wz*wz);
    wy /= wm;
    wz /= wm;
    let vy = wz;
    let vz = -wy;
    let roy = wy * d - 600.0;
    let roz = wz * d + 50.0;
    let t = ((-600.0 - roy) * -wy + (-50.0 - roz) * -wz);
    let y0 = t * -0.5 * state.height / focalLength;
    let z0 = t;
    let y1 = y0 + 1200.0 * vy + 400.0 * -wy;
    let z1 = z0 + 1200.0 * vz + 400.0 * -wz;
    let y2 = y0 + 200.0 * -wy;
    let z2 = z0 + 200.0 * -wz;
    let py0 = y0 * focalLength / z0;
    let py1 = y1 * focalLength / z1;
    pianoHeight = Math.abs(py1 - py0);
    gl.uniform1f(
      uOffsetYLocations,
      y2,
    );
  }
  gl.uniform2f(
    resolutionLocation,
    state.width,
    state.height,
  );
  state.pianoPositionLocation = gl.getAttribLocation(pianoProgram, "aVertexPosition");
  state.pianoVertices[0] = 0.0;
  state.pianoVertices[1] = 0.0;
  state.pianoVertices[2] = state.width;
  state.pianoVertices[3] = 0.0;
  state.pianoVertices[4] = state.width;
  state.pianoVertices[5] = pianoHeight;
  state.pianoVertices[6] = 0.0;
  state.pianoVertices[7] = 0.0;
  state.pianoVertices[8] = state.width;
  state.pianoVertices[9] = pianoHeight;
  state.pianoVertices[10] = 0.0;
  state.pianoVertices[11] = pianoHeight;
  gl.bindBuffer(gl.ARRAY_BUFFER, state.pianoGLVertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, state.pianoVertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(
    state.pianoPositionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0,
  );
  gl.viewport(0, 0, canvas.width, canvas.height);
  return state;
}

function drawGl(gl: WebGLRenderingContext, state: NotesGLState) {
  if (state.program == undefined) {
    return;
  }
  if (state.pianoProgram == undefined) {
    return;
  }
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
    if (noteCount != undefined) {
      gl.useProgram(state.program);
      gl.bindBuffer(gl.ARRAY_BUFFER, state.notesGLVertexBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, state.notesVertices.subarray(0, noteCount * 8 * 6));
      gl.vertexAttribPointer(
        state.positionLocation,
        2,
        gl.FLOAT,
        false,
        (2 + 4 + 2) * 4,
        0 * 4,
      );
      gl.vertexAttribPointer(
        state.colourLocation,
        4,
        gl.FLOAT,
        false,
        (2 + 4 + 2) * 4,
        4 * 4,
      );
      gl.vertexAttribPointer(
        state.textureCoordLocation,
        2,
        gl.FLOAT,
        false,
        (2 + 4 + 2) * 4,
        6 * 4,
      );
      gl.enableVertexAttribArray(state.positionLocation);
      gl.enableVertexAttribArray(state.colourLocation);
      gl.enableVertexAttribArray(state.textureCoordLocation);
      gl.drawArrays(gl.TRIANGLES, 0, noteCount * 6);
      gl.disableVertexAttribArray(state.positionLocation);
      gl.disableVertexAttribArray(state.colourLocation);
      gl.disableVertexAttribArray(state.textureCoordLocation);
    }
  }
  gl.useProgram(state.pianoProgram);
  gl.bindBuffer(gl.ARRAY_BUFFER, state.pianoGLVertexBuffer);
  gl.vertexAttribPointer(
    state.pianoPositionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0,
  );
  gl.enableVertexAttribArray(state.pianoPositionLocation);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.disableVertexAttribArray(state.pianoPositionLocation);
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

async function startAudio(): Promise<[ AudioContext, AudioWorkletNode, ]> {
  let audioCtx = new AudioContext();
  await audioCtx.audioWorklet.addModule(musicAudioWorkletProcessorUrl);
  let audioWorkletNode = new AudioWorkletNode(audioCtx, "music-audio-worklet-processor");
  initAudioCtx(audioCtx, audioWorkletNode);
  audioWorkletNode.connect(audioCtx.destination);
  return [ audioCtx, audioWorkletNode, ];
}

let initAudioCtx = async (audioCtx: AudioContext, workletNode: AudioWorkletNode) => {
  const presetIndex = 0;
  const sf2Data = await fetch("./Thurston Waffles.sf2").then((x) => x.arrayBuffer());
  const soundfont = new SoundFont2(new Uint8Array(sf2Data));
  const preset: Preset = soundfont.presets[presetIndex];
  if (!preset) {
      throw new Error(`Preset at index ${presetIndex} not found.`);
  }
  const instrument: Instrument = soundfont.instruments[preset.header.bagIndex];
  if (!instrument) {
      throw new Error(`No instrument found for preset at index ${presetIndex}`);
  }
  const findSampleForNote = (instr: Instrument, note: number): Sample | null => {
    for (const zone of instr.zones) {
      if (zone.keyRange == undefined) {
        continue;
      }
        // Check if the note is within the zone's key range.
        if (note >= zone.keyRange.lo && note <= zone.keyRange.hi) {
            return zone.sample;
        }
    }
    return null;
  };
  let noteNumber = 60;
  const sample: Sample | null = findSampleForNote(instrument, noteNumber);
  if (!sample) {
      throw new Error(`No sample found for note ${noteNumber} in preset ${presetIndex}.`);
  }
  const sampleRate: number = sample.header.sampleRate;
  const totalSamples: number = sample.data.length;
  const channelData: Float32Array = new Float32Array(totalSamples);
  for (let i = 0; i < totalSamples; i++) {
      channelData[i] = sample.data[i] / 32768.0;
  }
  const samplePitch: number = sample.header.originalPitch;
  workletNode.port.postMessage({
    type: "meowData",
    params: {
      meowOriginalPitch: samplePitch,
      meowSampleRate: sampleRate,
      meowData: channelData,
    },
  });
};

export default Waterfall;
