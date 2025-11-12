import * as THREE from "three";
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLSL } from "@bigmistqke/view.gl";
import { compile, glsl } from "@bigmistqke/view.gl/tag";
import { Accessor, Component, ComponentProps, createComputed, createEffect, createMemo, createSignal, on, onCleanup, onMount, splitProps } from "solid-js";
import { createStore } from "solid-js/store";
import { Overwrite } from "tool-kitty-util";
import { march } from "tool-kitty-marching-cubes";

const MarchingCubes: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      //sdf: (x: number, y: number, z: number) => number,
      sdfEvalCode: GLSL<[{
        type: "uniform";
        kind: "ivec3";
        key: "uNumCubes";
      }, {
        type: "uniform";
        kind: "ivec2";
        key: "uResolution";
      }, {
        type: "uniform";
        kind: "vec3";
        key: "uEvalMin";
      }, {
        type: "uniform";
        kind: "float";
        key: "uCubeSize";
      }, any, any]>,
      onInit: (params: { gl: WebGLRenderingContext; program: WebGLProgram; rerender: () => void; }) => void,
    }
  >
> = (_props) => {
  let [ state, setState, ] = createStore<{
    minXText: string,
    minYText: string,
    minZText: string,
    maxXText: string,
    maxYText: string,
    maxZText: string,
    cubeSizeText: string,
    interpolate: boolean,
  }>({
    minXText: "-5000",
    minYText: "-5000",
    minZText: "-5000",
    maxXText: "5000",
    maxYText: "5000",
    maxZText: "5000",
    cubeSizeText: "100",
    interpolate: true,
  });
  let [ props, rest, ] = splitProps(_props, ["sdfEvalCode", "onInit"]);
  let createReadNumberMemo = (read: () => string) => createMemo(() => {
    let x = Number.parseFloat(read());
    if (Number.isNaN(x)) {
      return undefined;
    }
    return x;
  });
  let minX = createReadNumberMemo(() => state.minXText);
  let minY = createReadNumberMemo(() => state.minYText);
  let minZ = createReadNumberMemo(() => state.minZText);
  let maxX = createReadNumberMemo(() => state.maxXText);
  let maxY = createReadNumberMemo(() => state.maxYText);
  let maxZ = createReadNumberMemo(() => state.maxZText);
  let cubeSize = createReadNumberMemo(() => state.cubeSizeText);
  let NumberField = (props: { name: string, read: string, write: (x: string) => void, }) => (
    <>
      <label
        class="label"
      >
        {props.name}
      </label>
      <input
        class="input"
        type="text"
        value={props.read}
        onInput={(e) => props.write(e.currentTarget.value)}
      />
    </>
  );
  // 512 * 512 == 64 * 64 * 64
  const width = 512;
  const height = 512;
  const chunkNumCubesX = 64;
  const chunkNumCubesY = 64;
  const chunkNumCubesZ = 64;
  let pixelBuffer = new Uint8Array((width * height) << 2);
  let resultsBuffer = new Float32Array(pixelBuffer.buffer);
  let offscreenCanvas = new OffscreenCanvas(width, height);
  let gl = offscreenCanvas.getContext("webgl");
  if (gl == null) {
    return undefined;
  }
  let vs = glsl`attribute vec4 aVertexPosition;
uniform mat4 uModelViewMatrix;
void main(void) {
  gl_Position = uModelViewMatrix * aVertexPosition;
}`;
  let program = compile(
    gl,
    vs,
    props.sdfEvalCode,
  );
  gl.useProgram(program.program);
  props.onInit({
    gl,
    program: program.program,
    rerender: () => {},
  });
  const positionLocation = gl.getAttribLocation(program.program, "aVertexPosition");
  const modelViewMatrixLocation = gl.getUniformLocation(program.program, "uModelViewMatrix");
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
  gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
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
  let numCubesX = createMemo(on(
    [ minX, maxX, cubeSize, ],
    ([ minX, maxX, cubeSize ]) => {
      if (minX == undefined || maxX == undefined || cubeSize == undefined) {
        return undefined;
      }
      return Math.ceil((maxX - minX) / cubeSize);
    }
  ));
  let numCubesY = createMemo(on(
    [ minY, maxY, cubeSize, ],
    ([ minY, maxY, cubeSize ]) => {
      if (minY == undefined || maxY == undefined || cubeSize == undefined) {
        return undefined;
      }
      return Math.ceil((maxY - minY) / cubeSize);
    }
  ));
  let numCubesZ = createMemo(on(
    [ minZ, maxZ, cubeSize, ],
    ([ minZ, maxZ, cubeSize ]) => {
      if (minZ == undefined || maxZ == undefined || cubeSize == undefined) {
        return undefined;
      }
      return Math.ceil((maxZ - minZ) / cubeSize);
    }
  ));
  let gridStorage = createMemo(on(
    [ numCubesX, numCubesY, numCubesZ, ],
    ([ numCubesX, numCubesY, numCubesZ, ]) => {
      if (numCubesX == undefined || numCubesY == undefined || numCubesZ == undefined) {
        return undefined;
      }
      let storage: number[][][] = [];
      for (let i = 0; i < numCubesZ; ++i) {
        let slice: number[][] = [];
        for (let j = 0; j < numCubesY; ++j) {
          let row: number[] = [];
          for (let k = 0; k < numCubesX; ++k) {
            row.push(0.0);
          }
          slice.push(row);
        }
        storage.push(slice);
      }
      return storage;
    },
  ));
  let model = createMemo(on(
    [ minX, minY, minZ, maxX, maxY, maxZ, numCubesX, numCubesY, numCubesZ, cubeSize, gridStorage, ],
    ([ minX, minY, minZ, maxX, maxY, maxZ, numCubesX, numCubesY, numCubesZ, cubeSize, gridStorage, ]) => {
      if (
        minX == undefined ||
        minY == undefined ||
        minZ == undefined ||
        maxX == undefined ||
        maxY == undefined ||
        maxZ == undefined ||
        numCubesX == undefined ||
        numCubesY == undefined ||
        numCubesZ == undefined ||
        cubeSize == undefined ||
        gridStorage == undefined
      ) {
        return undefined;
      }
      program.view.uniforms["uNumCubes"].set(
        chunkNumCubesX,
        chunkNumCubesY,
        chunkNumCubesZ,
      );
      program.view.uniforms["uResolution"].set(
        width,
        height,
      );
      program.view.uniforms["uCubeSize"].set(
        cubeSize,
      );
      let useMinX = (minX + maxX - numCubesX * cubeSize) * 0.5;
      let useMinY = (minY + maxY - numCubesY * cubeSize) * 0.5;
      let useMinZ = (minZ + maxZ - numCubesZ * cubeSize) * 0.5;
      let numStepsX = Math.ceil(numCubesX / chunkNumCubesX);
      let numStepsY = Math.ceil(numCubesY / chunkNumCubesY);
      let numStepsZ = Math.ceil(numCubesZ / chunkNumCubesZ);
      for (let iz = 0, atMinZ = useMinZ; iz < numStepsZ; ++iz, atMinZ += cubeSize * chunkNumCubesZ) {
        let soz = iz * chunkNumCubesZ;
        for (let iy = 0, atMinY = useMinY; iy < numStepsY; ++iy, atMinY += cubeSize * chunkNumCubesY) {
          let soy = iy * chunkNumCubesY;
          for (let ix = 0, atMinX = useMinX; ix < numStepsX; ++ix, atMinX += cubeSize * chunkNumCubesX) {
            let sox = ix * chunkNumCubesX;
            program.view.uniforms["uEvalMin"].set(
              atMinX,
              atMinY,
              atMinZ,
            );
            gl.drawArrays(gl.TRIANGLES, 0, 6);
            gl.flush();
            gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelBuffer);
            for (let oz = soz; oz < soz + chunkNumCubesZ; ++oz) {
              if (oz >= gridStorage.length) {
                break;
              }
              let sliceStorage = gridStorage[oz];
              for (let oy = soy; oy < soy + chunkNumCubesY; ++oy) {
                if (oy >= sliceStorage.length) {
                  break;
                }
                let rowStorage = sliceStorage[oy];
                for (let ox = sox; ox < sox + chunkNumCubesX; ++ox) {
                  if (ox >= rowStorage.length) {
                    break;
                  }
                  ///
                  let pOffset = (
                    ((oz - soz) * chunkNumCubesY + (oy - soy)) * chunkNumCubesX
                    + (ox - sox)
                  );
                  let value = resultsBuffer[pOffset];
                  gridStorage[oz][oy][ox] = value;
                }
              }
            }
          }
        }
      }
      let {
        points,
        triangles,
      } = march({
        sdf: (x, y, z) => gridStorage[z][y][x],
        minX: 0,
        minY: 0,
        minZ: 0,
        maxX: gridStorage[0][0].length-1,
        maxY: gridStorage[0].length-1,
        maxZ: gridStorage.length-1,
        cubeSize: 1,
        interpolate: true,
      });
      for (let i = 0; i < points.length; ++i) {
        points[i] *= cubeSize;
      }
      for (let i = 0; i < points.length-2; i += 3) {
        points[i] += useMinX;
        points[i+1] += useMinY;
        points[i+2] += useMinZ;
      }
      return {
        points,
        triangles,
      };
    },
  ));
  let [ canvasDiv, setCanvasDiv, ] = createSignal<HTMLDivElement>();
  let [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  let rerender = () => {};
  let scene = new THREE.Scene();
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // color, intensity
  scene.add(ambientLight);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.7);
  directionalLight.position.set(5, 10, 2); // x, y, z
  scene.add(directionalLight);
  let camera = new THREE.PerspectiveCamera(
    50,
    1,
    500.0,
    100_000.0,
  );
  camera.position.set(-5000,-5000,-5000);
  camera.lookAt(new THREE.Vector3(0.0, 0.0, 0.0));
  onMount(on(
    [ canvas, canvasDiv, ],
    ([ canvas, canvasDiv, ]) => {
      if (canvas == undefined) {
        return;
      }
      if (canvasDiv == undefined) {
        return;
      }
      let renderer = new THREE.WebGLRenderer({
        canvas,
      });
      rerender = () => {
        renderer.render(scene, camera);
      };
      let resizeObserver = new ResizeObserver(() => {
        let rect = canvasDiv.getBoundingClientRect();
        /*
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;*/
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
        renderer.setSize(rect.width, rect.height);
        renderer.setPixelRatio(window.devicePixelRatio);
        rerender();
      });
      resizeObserver.observe(canvasDiv);
      onCleanup(() => {
        resizeObserver.unobserve(canvasDiv);
        resizeObserver.disconnect();
      });
      const controls = new OrbitControls( camera, renderer.domElement );
      controls.addEventListener("change", () => {
        rerender();
      });
    }
  ));
  createEffect(on(
    model,
    (model) => {
      if (model == undefined) {
        return;
      }
      let geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(model.points);
      const positionAttribute = new THREE.Float32BufferAttribute(positions, 3);
      geometry.setAttribute("position", positionAttribute);
      geometry.setIndex(model.triangles);
      geometry.computeVertexNormals();
      let material = new THREE.MeshStandardMaterial({
        color: "#008080",
      });
      let mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);
      onCleanup(() => {
        geometry.dispose();
        material.dispose();
        scene.remove(mesh);
      });
      rerender();
    },
  ));
  return (
    <div {...rest}>
      <div style={{
        "width": "100%",
        "height": "100%",
        "display": "flex",
        "flex-direction": "column",
      }}>
        <div>
          <NumberField
            name="Min X:"
            read={state.minXText}
            write={(x) => setState("minXText", x)}
          />
          <NumberField
            name="Min Y:"
            read={state.minYText}
            write={(x) => setState("minYText", x)}
          />
          <NumberField
            name="Min Z:"
            read={state.minZText}
            write={(x) => setState("minZText", x)}
          />
          <NumberField
            name="Max X:"
            read={state.maxXText}
            write={(x) => setState("maxXText", x)}
          />
          <NumberField
            name="Max Y:"
            read={state.maxYText}
            write={(x) => setState("maxYText", x)}
          />
          <NumberField
            name="Max Z:"
            read={state.maxZText}
            write={(x) => setState("maxZText", x)}
          />
          <NumberField
            name="Cube Size:"
            read={state.cubeSizeText}
            write={(x) => setState("cubeSizeText", x)}
          />
        </div>
        <div
          ref={setCanvasDiv}
          style={{
            "flex-grow": "1",
          }}
        >
          <canvas
            ref={setCanvas}
            style={{
              "width": "100%",
              "height": "100%",
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MarchingCubes;
