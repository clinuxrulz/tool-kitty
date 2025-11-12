import { batch, Component, ComponentProps, createEffect, createMemo, createSignal, For, on, Show, splitProps, untrack } from "solid-js";
import { EcsWorld } from "tool-kitty-ecs";
import { NodeEditorUI, NodesSystem } from "tool-kitty-node-editor";
import { base64ToUint8Array, Overwrite, uint8ArrayToBase64 } from "tool-kitty-util";
import { NodeExt, NodeTypeExt } from "./NodeExt";
import { nodeRegistry } from "./nodes/node_registery";
import { createStore } from "solid-js/store";
import { generateCode } from "./code-gen";
import { registry } from "./components/registry";
import { compile, glsl } from "@bigmistqke/view.gl/tag";
import { OrbitalCamera } from "./OrbitalCamera";
import { Quaternion, Transform3D, Vec3 } from "tool-kitty-math";
import { gzip, ungzip } from "pako";
import { NodeEditorController } from "tool-kitty-node-editor/src/NodeEditorUI";
import MarchingCubes from "./MarchingCubes";
import { Portal } from "solid-js/web";

type GLState = {
  width: number,
  height: number,
  positionLocation: number,
  verticesGLBuffer: WebGLBuffer,
  vertices: Float32Array,
  vertexShader: WebGLShader,
  fragmentShader: WebGLShader,
  shaderProgram: WebGLProgram,
  tolleranceLocation: WebGLUniformLocation | null,
  maxStepLocation: WebGLUniformLocation | null,
  inverseViewMatrix: Float32Array,
  inverseViewMatrixLocation: WebGLUniformLocation | null,
  useOrthogonalProjectionLocation: WebGLUniformLocation | null,
  orthogonalProjectionScaleLocation: WebGLUniformLocation | null,
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
  const projections = [
    "Orthogonal" as const,
    "Perspective" as const,
  ];
  type Projection = (typeof projections)[number];
  let [ state, setState, ] = createStore<{
    windowWidth: number,
    windowHeight: number,
    showCode: boolean,
    projection: Projection,
    orthoScaleText: string,
    maxIterationsText: string,
    tolleranceText: string,
    maxStepText: string,
    showMarchingCubes: boolean,
  }>({
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    showCode: false,
    projection: "Perspective",
    orthoScaleText: "0.1",
    maxIterationsText: "20",
    tolleranceText: "10.0",
    maxStepText: "20000.0",
    showMarchingCubes: false,
  });
  let orbitalCamera = new OrbitalCamera({
    initSpace: Transform3D.create(Vec3.create(0.0, 0.0, 10_000.0), Quaternion.identity),
    initOrbitTarget: Vec3.zero,
  });
  let [ nodeEditorController, setNodeEditorController, ] = createSignal<NodeEditorController<NodeTypeExt,NodeExt>>();
  let orthoScale = createMemo(() => {
    let x = Number.parseFloat(state.orthoScaleText);
    if (Number.isNaN(x)) {
      return 0.1;
    }
    return x;
  });
  let maxIterations = createMemo(() => {
    let x = Number.parseInt(state.maxIterationsText);
    if (Number.isNaN(x)) {
      return 100;
    }
    return x;
  });
  let tollerance = createMemo(() => {
    let x = Number.parseFloat(state.tolleranceText);
    if (Number.isNaN(x)) {
      return 0.01;
    }
    return x;
  });
  let maxStep = createMemo(() => {
    let x = Number.parseFloat(state.maxStepText);
    if (Number.isNaN(x)) {
      return 10_000.0;
    }
    return x;
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
      maxIterations: maxIterations(),
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
  let rerender: () => void;
  {
    let aboutToRender = false;
    rerender = () => {
      let gl2 = gl();
      if (gl2 == undefined) {
        return;
      }
      if (glState == undefined) {
        return;
      }
      let glState2 = glState;
      if (aboutToRender) {
        return;
      }
      aboutToRender = true;
      requestAnimationFrame(() => {
        aboutToRender = false;
        gl2.bindBuffer(gl2.ARRAY_BUFFER, glState2.verticesGLBuffer);
        gl2.enableVertexAttribArray(glState2.positionLocation);
        gl2.drawArrays(gl2.TRIANGLES, 0, 6);
        gl2.disableVertexAttribArray(glState2.positionLocation);
      });
    };
  }

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
      glState = initGL(gl, canvas, orbitalCamera, code2);
    },
  ));
  createEffect(on(
    [ gl, code, ],
    ([ gl, code, ]) => {
      let nodesSystem2 = nodesSystem();
      if (nodesSystem2 == undefined) {
        return undefined;
      }
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
      let newFramementShader = loadShader(gl, gl.FRAGMENT_SHADER, compile.toString(code.code));
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
      const tolleranceLocation = gl.getUniformLocation(shaderProgram, "uTollerance");
      const maxStepLocation = gl.getUniformLocation(shaderProgram, "uMaxStep");
      const focalLengthLocation = gl.getUniformLocation(shaderProgram, "uFocalLength");
      const modelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
      const resolutionLocation = gl.getUniformLocation(shaderProgram, "resolution");
      const useOrthogonalProjectionLocation = gl.getUniformLocation(shaderProgram, "uUseOrthogonalProjection");
      const orthogonalProjectionScaleLocation = gl.getUniformLocation(shaderProgram, "uOrthogonalScale");
      glState.tolleranceLocation = tolleranceLocation;
      glState.maxStepLocation = maxStepLocation;
      glState.inverseViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uInverseViewMatrix");
      glState.useOrthogonalProjectionLocation = useOrthogonalProjectionLocation;
      glState.orthogonalProjectionScaleLocation = orthogonalProjectionScaleLocation;
      orbitalCamera.writeGLInverseViewMatrix(glState.inverseViewMatrix);
      gl.uniformMatrix4fv(
        glState.inverseViewMatrixLocation,
        false,
        glState.inverseViewMatrix,
      );
      gl.uniform1i(
        useOrthogonalProjectionLocation,
        state.projection == "Orthogonal" ? 1 : 0,
      );
      gl.uniform1f(
        tolleranceLocation,
        tollerance(),
      );
      gl.uniform1f(
        maxStepLocation,
        maxStep(),
      )
      gl.uniform1f(
        orthogonalProjectionScaleLocation,
        orthoScale(),
      );
      gl.uniform1f(
        focalLengthLocation,
        focalLength,
      );
      gl.uniform2f(
        resolutionLocation,
        width,
        height,
      );
      code.onInit({ gl, program: shaderProgram, rerender, });
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
  createEffect(on(
    () => state.projection,
    (projection) => {
      let gl2 = gl();
      if (gl2 == undefined) {
        return undefined;
      }
      if (glState == undefined) {
        return undefined;
      }
      switch (projection) {
        case "Orthogonal":
          gl2.uniform1i(
            glState.useOrthogonalProjectionLocation,
            1,
          );
          break;
        case "Perspective":
          gl2.uniform1i(
            glState.useOrthogonalProjectionLocation,
            0,
          );
          break;
      }
      rerender();
    },
    { defer: true, },
  ));
  createEffect(on(
    tollerance,
    (tollerance) => {
      let gl2 = gl();
      if (gl2 == undefined) {
        return undefined;
      }
      if (glState == undefined) {
        return undefined;
      }
      gl2.uniform1f(
        glState.tolleranceLocation,
        tollerance,
      );
      rerender();
    },
    { defer: true, },
  ));
  createEffect(on(
    maxStep,
    (maxStep) => {
      let gl2 = gl();
      if (gl2 == undefined) {
        return undefined;
      }
      if (glState == undefined) {
        return undefined;
      }
      gl2.uniform1f(
        glState.maxStepLocation,
        maxStep,
      );
      rerender();
    },
    { defer: true, }
  ));
  createEffect(on(
    orthoScale,
    (orthoScale) => {
      let gl2 = gl();
      if (gl2 == undefined) {
        return undefined;
      }
      if (glState == undefined) {
        return undefined;
      }
      gl2.uniform1f(
        glState.orthogonalProjectionScaleLocation,
        orthoScale,
      );
      rerender();
    },
    { defer: true },
  ));
  createEffect(on(
    () => orbitalCamera.space(),
    () => {
      let gl2 = gl();
      if (gl2 == undefined) {
        return undefined;
      }
      if (glState == undefined) {
        return undefined;
      }
      orbitalCamera.writeGLInverseViewMatrix(glState.inverseViewMatrix);
      gl2.uniformMatrix4fv(
        glState.inverseViewMatrixLocation,
        false,
        glState.inverseViewMatrix,
      );
      rerender();
    },
    { defer: true, },
  ));
  let exportToClipboard = async () => {
    let isUUIDRegEx = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    let shortIdMap = new Map<string,string>();
    let nextId = 0;
    for (let entity of props.world.entities()) {
      if (isUUIDRegEx.test(entity)) {
        shortIdMap.set(entity, `${nextId++}`);
      }
    }
    let data1 = JSON.stringify(props.world.toJson());
    for (let [ entityId, shortId ] of shortIdMap.entries()) {
      data1 = data1.replaceAll(entityId, shortId);
    }
    let data2 = gzip(data1);
    let data3 = uint8ArrayToBase64(data2);
    await window.navigator.clipboard.writeText(data3);
  };
  let importFromClipboard = async () => {
    try {
      let data1 = await window.navigator.clipboard.readText();
      let data2 = base64ToUint8Array(data1);
      let data3 = ungzip(data2);
      let decoder = new TextDecoder("utf-8");
      let data4 = decoder.decode(data3);
      let data5 = JSON.parse(data4);
      let newWorld = EcsWorld.fromJson(registry, data5);
      if (newWorld.type == "Err") {
        throw new Error(newWorld.message);
      }
      let newWorld2 = newWorld.value;
      batch(() => {
        let world = props.world;
        for (let entity of [...world.entities()]) {
          world.destroyEntity(entity);
        }
        for (let entity of newWorld2.entities()) {
          let components = newWorld2.getComponents(entity);
          world.createEntityWithId(entity, components);
        }
      });
    } catch (err) {
      console.log(err);
      alert("Failed to read clipboard.");
    }
  };
  let doMarchingCubes = () => {
    setState("showMarchingCubes", true);
  };
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
          "flex-direction": isLandscape() ? "row" : "column",
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
              setNodeEditorController(controller);
            }}
            componentRegistry={registry}
            nodeRegistry={nodeRegistry}
            world={props.world}
            menu={
              <>
                <li>
                  <a
                    onClick={() => {
                      exportToClipboard();
                      nodeEditorController()?.closeMenu();
                    }}
                  >
                    Export To Clipboard
                  </a>
                </li>
                <li>
                  <a
                    onClick={() => {
                      importFromClipboard();
                      nodeEditorController()?.closeMenu();
                    }}
                  >
                    Import From Clipboard
                  </a>
                </li>
                <li>
                  <a
                    onClick={() => {
                      doMarchingCubes();
                      nodeEditorController()?.closeMenu();
                    }}
                  >
                    Marching Cubes
                  </a>
                </li>
              </>
            }
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
              <select
                class="select select-sm"
                style="width: fit-content;"
                onChange={(e) => {
                  if (e.currentTarget.selectedOptions.length != 1) {
                    return;
                  }
                  let value = e.currentTarget.selectedOptions[0].value;
                  setState("projection", value as Projection);
                }}
              >
                <For each={projections}>
                  {(projection) => (
                    <option
                      value={projection}
                      selected={state.projection == projection}
                    >
                      {projection}
                    </option>
                  )}
                </For>
              </select>
            </>}
          />
        </div>
        <div
          ref={setCanvasDiv}
          style={{
            "flex": "1",
            "display": "flex",
            "overflow": "hidden",
            "position": "relative",
          }}
        >
          <canvas
            ref={setCanvas}
            style={{
              "flex-grow": "1",
              "touch-action": "none",
            }}
            onPointerDown={(e) => {
              orbitalCamera.pointerDown(e);
            }}
            onPointerUp={(e) => {
              orbitalCamera.pointerUp(e);
            }}
            onPointerMove={(e) => {
              orbitalCamera.pointerMove(e);
            }}
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
                <pre innerText={compile.toString(code().code)}/>
              </div>
            }
          </Show>
          <div
            style={{
              "position": "absolute",
              "left": "0",
              "top": "0",
            }}
          >
            <Show when={state.projection == "Orthogonal"}>
              <label
                class="input input-sm"
                style={{
                  "width": "100px",
                }}
              >
                Scale:
                <input
                  type="text"
                  value={state.orthoScaleText}
                  onInput={(e) => {
                    setState("orthoScaleText", e.currentTarget.value);
                  }}
                />
              </label>
            </Show>
            <label
              class="input input-sm"
              style={{
                "width": "100px",
              }}
            >
              Max Iter:
              <input
                type="text"
                value={state.maxIterationsText}
                onInput={(e) => {
                  setState("maxIterationsText", e.currentTarget.value);
                }}
              />
            </label>
            <label
              class="input input-sm"
              style={{
                "width": "100px",
              }}
            >
              Tol:
              <input
                type="text"
                value={state.tolleranceText}
                onInput={(e) => {
                  setState("tolleranceText", e.currentTarget.value);
                }}
              />
            </label>
            <label
              class="input input-sm"
              style={{
                "width": "120px",
              }}
            >
              MxStp:
              <input
                type="text"
                value={state.maxStepText}
                onInput={(e) => {
                  setState("maxStepText", e.currentTarget.value);
                }}
              />
            </label>
          </div>
        </div>
      </div>
      <Show when={state.showMarchingCubes ? code() : undefined}>
        {(code) => (
          <Portal>
            <MarchingCubes
              style={{
                "position": "absolute",
                "left": "0",
                "top": "0",
                "right": "0",
                "bottom": "0",
                "background-color": "black",
              }}
              sdfEvalCode={code().mkEvalSdfCode()}
              onInit={(params) => code().onInit(params)}
            />
          </Portal>
        )}
      </Show>
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

function initGL(gl: WebGLRenderingContext, canvas: HTMLCanvasElement, orbitalCamera: OrbitalCamera, fragmentShaderCode: ReturnType<typeof generateCode>): GLState | undefined {
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
      compile.toString(fragmentShaderCode.code),
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
  const tolleranceLocation = gl.getUniformLocation(shaderProgram, "uTollerance");
  const maxStepLocation = gl.getUniformLocation(shaderProgram, "uMaxStep");
  const focalLengthLocation = gl.getUniformLocation(shaderProgram, "uFocalLength");
  const modelViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uModelViewMatrix");
  const resolutionLocation = gl.getUniformLocation(shaderProgram, "resolution");
  const inverseViewMatrixLocation = gl.getUniformLocation(shaderProgram, "uInverseViewMatrix");
  const useOrthogonalProjectionLocation = gl.getUniformLocation(shaderProgram, "uUseOrthogonalProjection");
  const orthogonalProjectionScaleLocation = gl.getUniformLocation(shaderProgram, "uOrthogonalScale");
  let inverseViewMatrix = new Float32Array(16);
  untrack(() => orbitalCamera.writeGLInverseViewMatrix(inverseViewMatrix));
  gl.uniformMatrix4fv(
    inverseViewMatrixLocation,
    false,
    inverseViewMatrix,
  );
  gl.uniform1i(
    useOrthogonalProjectionLocation,
    0,
  );
  gl.uniform1f(
    orthogonalProjectionScaleLocation,
    0.1,
  );
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
    tolleranceLocation,
    maxStepLocation,
    inverseViewMatrix,
    inverseViewMatrixLocation,
    useOrthogonalProjectionLocation,
    orthogonalProjectionScaleLocation,
  };
  return state;
}

export default ModelEditor;
