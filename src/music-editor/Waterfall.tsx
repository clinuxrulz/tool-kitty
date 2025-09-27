import { Component, createComputed, createMemo, createSignal, on } from "solid-js";

type Note = {
  startTime: number,
  holdTime: number,
  note: number,
  colourR: number,
  colourG: number,
  colourB: number,
  isAlive: boolean,
  prev: Note,
  next: Note | undefined,
};

type NotesGLState = {
  maxNotes: number,
  numNotes: number,
  notesVertices: Float32Array,
  notesColours: Float32Array,
  notesGLVertexBuffer: WebGLBuffer | undefined,
  notesGLColourBuffer: WebGLBuffer | undefined,
  notesHead: Note | undefined,
  notesTail: Note | undefined,
  freeNotesHead: Note | undefined,
  freeNotesTail: Node | undefined,
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

function initGL(gl: WebGLRenderingContext): NotesGLState {
  let state: NotesGLState = {
    maxNotes: INIT_MAX_NOTES,
    numNotes: 0,

  };
  return state;
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
