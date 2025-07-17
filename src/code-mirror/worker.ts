import {
  createSystem,
  createVirtualTypeScriptEnvironment,
  VirtualTypeScriptEnvironment,
} from "@typescript/vfs";
import * as Comlink from "comlink";
import { createWorker } from "@valtown/codemirror-ts/worker";

//

const browserTypeDefs = import.meta.glob(
  "../../node_modules/typescript/lib/**/*.d.ts",
  {
    as: "raw",
    eager: true,
  },
);
const browserTypeDefs2: Record<string, string> = {};
for (let path in browserTypeDefs) {
  browserTypeDefs2[
    "/" + path.slice("../../node_modules/typescript/lib/".length)
  ] = browserTypeDefs[path];
}

const libTypeDef = import.meta.glob("../../types/**/*.d.ts", {
  as: "raw",
  eager: true,
});
const libTypeDef2: Record<string, string> = {};
for (let path in libTypeDef) {
  libTypeDef2["/node_modules/prelude/" + path.slice("../../types/".length)] =
    libTypeDef[path];
}

//

const solidjsTypeDef = import.meta.glob(
  "../../node_modules/solid-js/**/*.d.ts",
  { as: "raw", eager: true },
);
const solidjsTypeDef2: Record<string, string> = {};
for (let path in solidjsTypeDef) {
  solidjsTypeDef2[
    "/node_modules/prelude/" + path.slice("../../node_modules/".length)
  ] = solidjsTypeDef[path];
}

//

const pixiTypeDefs = import.meta.glob("../../node_modules/pixi.js/**/*.d.ts", {
  as: "raw",
  eager: true,
});
let pixiTypeDefs2: Record<string, string> = {};
for (let path in pixiTypeDefs) {
  pixiTypeDefs2[
    "/node_modules/prelude/" + path.slice("../../node_modules/".length)
  ] = pixiTypeDefs[path];
}

//

const types: Record<string, string> = {
  ...browserTypeDefs2,
  ...libTypeDef2,
  ...solidjsTypeDef2,
  ...pixiTypeDefs2,
};

function createWorker2(
  fn: () => Promise<VirtualTypeScriptEnvironment>,
): ReturnType<typeof createWorker> & {
  deleteFile(path: string): void;
} {
  let env: VirtualTypeScriptEnvironment | undefined;
  let result = createWorker(
    (async () => {
      let env2 = await fn();
      env = env2;
      return { env: env2 };
    })(),
  );
  return {
    initialize() {
      return result.initialize();
    },
    updateFile(params): void {
      return result.updateFile(params);
    },
    getLints(params) {
      return result.getLints(params);
    },
    getAutocompletion(params) {
      return result.getAutocompletion(params);
    },
    getHover(params) {
      return result.getHover(params);
    },
    getEnv() {
      return result.getEnv();
    },
    deleteFile(path) {
      return env?.deleteFile(path);
    },
  };
}

Comlink.expose(
  createWorker2(async function () {
    // @ts-ignore
    const ts = await import(
      // @ts-ignore
      /* vite-ignore */ "https://esm.sh/typescript@5.7.2"
    );
    const fsMap = new Map<string, string>();
    for (let entry of Object.entries(types)) {
      fsMap.set(entry[0], entry[1]);
    }
    const system = createSystem(fsMap);
    const compilerOpts: any = {
      //ts.CompilerOptions = {
      paths: {
        prelude: ["/node_modules/prelude/lib.js"],
        "prelude/solid-js": ["/node_modules/prelude/solid-js/types/index.js"],
        "prelude/solid-js/store": [
          "/node_modules/prelude/solid-js/store/types/index.js",
        ],
        "prelude/pixi.js": ["/node_modules/prelude/pixi.js/lib/index.js"],
      },
    };
    return createVirtualTypeScriptEnvironment(system, [], ts, compilerOpts);
  }),
);
