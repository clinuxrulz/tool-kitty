import { batch, Component, ComponentProps, createEffect, createMemo, createSignal, on, Show, splitProps } from "solid-js";
import { EcsWorld } from "tool-kitty-ecs";
import { NodeEditorUI, NodesSystem } from "tool-kitty-node-editor";
import { Overwrite } from "tool-kitty-util";
import { NodeExt, NodeTypeExt } from "./NodeExt";
import { nodeRegistry } from "./nodes/node_registery";
import { createStore } from "solid-js/store";
import { generateCode } from "./code-gen";

type GLState = {
  width: number,
  height: number,
  positionLocation: number,
  verticesGLBuffer: WebGLBuffer,
  vertices: Float32Array,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  shaderProgram: WebGLProgram,
};

const FOV_Y = 50.0;

const ModelEditor: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      world: EcsWorld,
    }
  >
> = (props_) => {
  let [ props, rest, ] = splitProps(props_, [
    "world",
  ]);
  let [ state, setState, ] = createStore<{
    windowWidth: number,
    windowHeight: number,
    showCode: boolean,
  }>({
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    showCode: false,
  });
  window.addEventListener("resize", () => {
    batch(() => {
      setState("windowWidth", window.innerWidth);
      setState("windowHeight", window.innerHeight);
    });
  });
  let isLandscape = createMemo(() => state.windowWidth > state.windowHeight);
  let [ nodesSystem, setNodesSystem, ] = createSignal<NodesSystem<NodeTypeExt,NodeExt>>();
  let code = createMemo(() => {
    let nodesSystem2 = nodesSystem();
    if (nodesSystem2 == undefined) {
      return undefined;
    }
    return generateCode({
      nodesSystem: nodesSystem2,
    });
  });
  let [ canvasDiv, setCanvasDiv, ] = createSignal<HTMLDivElement>();
  let [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  let [ gl, setGl, ] = createSignal<WebGLRenderingContext>();
  createEffect(on(
    [ canvasDiv, canvas, ],
    ([ canvasDiv, canvas, ]) => {
      if (canvasDiv == undefined || canvas == undefined) {
        return;
      }
      let rect = canvasDiv.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.setProperty("background-color", "darkblue");
      let gl = canvas.getContext("webgl");
      if (gl == null) {
        return;
      }
      setGl(gl);
    },
  ));
  let glState: GLState | undefined = undefined;
  createEffect(on(
    [ gl, canvas, ],
    ([ gl, canvas, ]) => {
      if (gl == undefined || canvas == undefined) {
        return;
      }
      let code2 = code();
      if (code2 == undefined) {
        return;
      }
      glState = initGL(gl, canvas, code2);
    },
  ))
  createEffect(on(
    [ gl, code, ],
    ([ gl, code, ]) => {
      let canvas2 = canvas();
      if (canvas2 == undefined) {
        return;
      }
      let width = canvas2.width;
      let height = canvas2.height;
      const focalLength = 0.5 * height / Math.tan(0.5 * FOV_Y * Math.PI / 180.0);
      if (glState == undefined) {
        return;
      }
      if (gl == undefined) {
        return;
      }
      if (code == undefined) {
        return;
      }
      let newFramementShader = loadShader(gl, gl.FRAGMENT_SHADER, code);
      if (newFramementShader == undefined) {
        return;
      }
      gl.detachShader(glState.shaderProgram, glState.fragmentShader);
      gl.deleteShader(glState.fragmentShader);
      glState.fragmentShader = newFramementShader;
      gl.attachShader(glState.shaderProgram, glState.fragmentShader);
      gl.linkProgram(glState.shaderProgram);
      if (!gl.getProgramParameter(glState.shaderProgram, gl.LINK_STATUS)) {
        console.error('ERROR linking program:', gl.getProgramInfoLog(glState.shaderProgram));
        return;
      }
      let shaderProgram = glState.shaderProgram;
      gl.useProgram(shaderProgram);
      const positionLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
      const focalLengthLocation = gl.getUniformLocation(shaderProgram, "uFocalLength");
      const modelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
      const resolutionLocation = gl.getUniformLocation(shaderProgram, "resolution");
      gl.uniform1f(
        focalLengthLocation,
        focalLength,
      );
      gl.uniform2f(
        resolutionLocation,
        width,
        height,
      );
      const vertices = glState.vertices;
      vertices[0] = 0.0;
      vertices[1] = 0.0;
      vertices[2] = width;
      vertices[3] = 0.0;
      vertices[4] = width;
      vertices[5] = height;
      vertices[6] = 0.0;
      vertices[7] = 0.0;
      vertices[8] = width;
      vertices[9] = height;
      vertices[10] = 0.0;
      vertices[11] = height;
      let verticesGLBuffer = glState.verticesGLBuffer;
      gl.bindBuffer(gl.ARRAY_BUFFER, verticesGLBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(
        positionLocation,
        2,
        gl.FLOAT,
        false,
        0,
        0,
      );
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
          width,
          0.0,
          height,
        ),
      );
      gl.uniformMatrix4fv(
        modelViewMatrixLocation,
        false,
        modelViewMatrix,
      );
      gl.viewport(0, 0, width, height);
      gl.enableVertexAttribArray(positionLocation);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      gl.disableVertexAttribArray(positionLocation);
    },
    { defer: true, },
  ));
  return (
    <div
      {...rest}
    >
      <div
        style={{
          "width": "100%",
          "height": "100%",
          "position": "relative",
          "display": "flex",
          "flex-direction": isLandscape() ? "row" : "column-reverse",
        }}
      >
        <div style={{
          "flex": "1",
          "display": "flex",
          "overflow": "hidden",
        }}>
          <NodeEditorUI
            style={{
              "flex-grow": "1",
            }}
            onInit={(controller) => {
              setNodesSystem(controller.nodesSystem);
            }}
            nodeRegistry={nodeRegistry}
            world={props.world}
            toolbar={<>
              <label class="label" style="margin-left: 5px;">
                <input
                  type="checkbox"
                  class="checkbox"
                  checked={state.showCode}
                  onChange={(e) => setState("showCode", e.currentTarget.checked)}
                />
                Show Code
              </label>
            </>}
          />
          <Show when={state.showCode ? code() : undefined}>
            {(code) =>
              <div
                style={{
                  "position": "absolute",
                  "right": "0",
                  "top": "0",
                  "bottom": "0",
                  "overflow": "auto",
                  "width": "50%",
                }}
              >
                <pre innerText={code()}/>
              </div>
            }
          </Show>
        </div>
        <div
          ref={setCanvasDiv}
          style={{
            "flex": "1",
            "display": "flex",
            "overflow": "hidden",
          }}
        >
          <canvas
            ref={setCanvas}
            style={{
              "flex-grow": "1",
            }}
          />
        </div>
      </div>
    </div>
  );
};

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

function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string): {
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  shaderProgram: WebGLProgram,
} | undefined {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  if (vertexShader == undefined) {
    return undefined;
  }
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (fragmentShader == undefined) {
    gl.deleteShader(vertexShader);
    return undefined;
  }
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    gl.detachShader(shaderProgram, vertexShader);
    gl.detachShader(shaderProgram, fragmentShader);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    gl.deleteProgram(shaderProgram)
    return undefined;
  }
  return {
    vertexShader,
    fragmentShader,
    shaderProgram,
  }
}

function initGL(gl: WebGLRenderingContext, canvas: HTMLCanvasElement, fragmentShaderCode: string): GLState | undefined {
  let width = canvas.width;
  let height = canvas.height;
  const focalLength = 0.5 * height / Math.tan(0.5 * FOV_Y * Math.PI / 180.0);
  let vertexShader: WebGLShader;
  let fragmentShader: WebGLShader;
  let shaderProgram: WebGLProgram;
  {
    const program = initShaderProgram(
      gl,
      `attribute vec4 aVertexPosition;

  uniform mat4 uModelViewMatrix;

  void main(void) {
    gl_Position = uModelViewMatrix * aVertexPosition;
  }
  `,
      fragmentShaderCode,
    );
    if (program == undefined) {
      return undefined;
    }
    vertexShader = program.vertexShader;
    fragmentShader = program.fragmentShader;
    shaderProgram = program.shaderProgram;
  }
  gl.useProgram(shaderProgram);
  const positionLocation = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  const focalLengthLocation = gl.getUniformLocation(shaderProgram, "uFocalLength");
  const modelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
  const resolutionLocation = gl.getUniformLocation(shaderProgram, "resolution");
  gl.uniform1f(
    focalLengthLocation,
    focalLength,
  );
  gl.uniform2f(
    resolutionLocation,
    width,
    height,
  );
  const vertices = new Float32Array(12);
  vertices[0] = 0.0;
  vertices[1] = 0.0;
  vertices[2] = width;
  vertices[3] = 0.0;
  vertices[4] = width;
  vertices[5] = height;
  vertices[6] = 0.0;
  vertices[7] = 0.0;
  vertices[8] = width;
  vertices[9] = height;
  vertices[10] = 0.0;
  vertices[11] = height;
  let verticesGLBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesGLBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
  gl.vertexAttribPointer(
    positionLocation,
    2,
    gl.FLOAT,
    false,
    0,
    0,
  );
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
      width,
      0.0,
      height,
    ),
  );
  gl.uniformMatrix4fv(
    modelViewMatrixLocation,
    false,
    modelViewMatrix,
  );
  gl.viewport(0, 0, width, height);
  gl.enableVertexAttribArray(positionLocation);
  gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.disableVertexAttribArray(positionLocation);
  let state: GLState = {
    width: canvas.width,
    height: canvas.height,
    positionLocation,
    verticesGLBuffer,
    vertices,
    vertexShader,
    fragmentShader,
    shaderProgram,
  };
  return state;
}

export default ModelEditor;
