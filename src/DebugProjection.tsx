import { Component, createRoot, on } from "solid-js";
import { Vec2 } from "./math/Vec2";
import {
  createJsonProjectionViaTypeSchemaV2,
  tsArray,
  tsNumber,
  tsObject,
  tsString,
  TypeSchema,
  vec2TypeSchema,
} from "./TypeSchema";
import { createStore, produce } from "solid-js/store";
import { createComputed } from "solid-js";
import { Repo } from "@automerge/automerge-repo";
import { makeDocumentProjection } from "solid-automerge";
import { EcsWorld } from "./ecs/EcsWorld";
import { EcsWorldAutomergeProjection } from "./ecs/EcsWorldAutomergeProjection";
import { frameComponentType } from "./level-builder/components/FrameComponent";
import { registry } from "./level-builder/components/registry";
import { projectMutableOverAutomergeDoc } from "./automerge-doc-mutable-proxy";

const DebugProjection: Component = () => {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        padding: "5px",
      }}
    >
      <button class="btn btn-primary" onClick={() => runTest1()}>
        Run Test 1 (type schema projection on automerge)
      </button>
      <br />
      <button
        class="btn btn-primary"
        style="margin-top: 5px;"
        onClick={() => runTest2()}
      >
        Run Test 2 (ecs world automerge projection)
      </button>
      <br />
      <button
        class="btn btn-primary"
        style="margin-top: 5px;"
        onClick={() => runTest3()}
      >
        Run Test 3 (brand new projection)
      </button>
    </div>
  );
};

function runTest1() {
  let repo = new Repo();
  let docHandle = repo.create({
    firstName: "John",
    lastName: "Smith",
    /**
     * This is a non-json object (Vec2) in the surrounding state
     */
    location: {
      x: 10.0,
      y: 15.0,
    },
    targets: [
      {
        x: 1,
        y: 3,
      },
      {
        x: 2,
        y: 2,
      },
      {
        x: 3,
        y: 1,
      },
    ],
    secretCodes: [
      [1, 3, 3, 7],
      [3, 1, 3, 3, 7],
      [4, 0],
    ],
  });
  type State = {
    firstName: string;
    lastName: string;
    location: Vec2;
    targets: Vec2[];
    secretCodes: number[][];
  };
  let objTypeSchema = tsObject({
    firstName: tsString(),
    lastName: tsString(),
    location: vec2TypeSchema,
    targets: tsArray(vec2TypeSchema),
    secretCodes: tsArray(tsArray(tsNumber())),
  }) as TypeSchema<State>;
  createRoot((dispose) => {
    let json = makeDocumentProjection(docHandle);
    let projection = createJsonProjectionViaTypeSchemaV2<State>(
      objTypeSchema,
      json,
      (callback) => docHandle.change((json2) => callback(json2)),
    );
    expect(projection.type == "Ok");
    if (projection.type != "Ok") {
      return;
    }
    let projection2 = projection.value;
    let [state, setState] = createStore(projection2);
    let x: number | undefined = undefined;
    createComputed(() => {
      x = state.secretCodes[2][1];
    });
    expect(x).toBe(0);
    setState("firstName", "Apple");
    setState("location", Vec2.create(1, 2));
    setState("targets", 1, Vec2.create(7, 7));
    createComputed(
      on(
        () => state.secretCodes,
        () => {
          console.log("A");
        },
        { defer: true },
      ),
    );
    createComputed(
      on(
        () => state.secretCodes[2],
        () => {
          console.log("B");
        },
        { defer: true },
      ),
    );
    createComputed(
      on(
        () => state.secretCodes[2][1],
        () => {
          console.log("C");
        },
        { defer: true },
      ),
    );
    setState("secretCodes", 2, 1, 2);
    expect(x).toBe(2);
    //
    expect(json.firstName).toBe("Apple");
    expect(json.lastName).toBe("Smith");
    expect(json.location.x).toBe(1);
    expect(json.location.y).toBe(2);
    expect(json.targets[1].x).toBe(7);
    expect(json.targets[1].y).toBe(7);
    expect(json.secretCodes[2][0]).toBe(4);
    expect(json.secretCodes[2][1]).toBe(2);
    //
    dispose();
  });
}

function runTest2() {
  let repo = new Repo();
  let docHandle = repo.create(new EcsWorld().toJson());
  createRoot((dispose) => {
    let world1_ = EcsWorldAutomergeProjection.create(registry, docHandle);
    let world2_ = EcsWorldAutomergeProjection.create(registry, docHandle);
    if (world1_.type == "Err" || world2_.type == "Err") {
      return;
    }
    let world1 = world1_.value;
    let world2 = world2_.value;
    createComputed(
      on(
        () => world2.entities(),
        (entities) => console.log(entities),
      ),
    );
    world1.createEntity([
      frameComponentType.create({
        name: "aaa",
        pos: Vec2.zero,
        size: Vec2.create(10, 10),
        numCells: Vec2.create(1, 1),
        metaData: null,
      }),
    ]);
    dispose();
  });
}

async function runTest3() {
  type State = {
    a: number;
    b: number[][];
  };
  let stateTypeSchema = tsObject({
    a: "Number",
    b: tsArray(tsArray(tsNumber())),
  }) as TypeSchema<State>;
  let repo = new Repo();
  let docHandle = repo.create({
    a: 5,
    b: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  });
  let r = new Promise<void>((resolve) => {
    createRoot((dispose) => {
      let doc = makeDocumentProjection(docHandle);
      let s = projectMutableOverAutomergeDoc<State>(
        doc,
        docHandle.change.bind(docHandle),
        stateTypeSchema,
      );
      let [state, setState] = createStore(s);
      let z = 0;
      createComputed(
        on(
          () => doc.a,
          () => {
            z = doc.a;
          },
          { defer: true },
        ),
      );
      setState("a", 7);
      expect(z).toBe(7);
      createComputed(
        on(
          () => doc.b[1][1],
          () => {
            z = doc.b[1][1];
          },
          { defer: true },
        ),
      );
      setState("b", 1, 1, 42);
      expect(z).toBe(42);
      setState(
        "b",
        1,
        produce((x) => {
          x.push(42);
        }),
      );
      expect(doc.b[1][4]).toBe(42);
      dispose();
      resolve();
    });
  });
  await r;
}

function expect(val: any) {
  return {
    toBe: (val2: any) => {
      if (val !== val2) {
        console.log(`${val} !== ${val2}`);
      }
    },
  };
}

export default DebugProjection;
