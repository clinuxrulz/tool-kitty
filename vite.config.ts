import { defineConfig } from 'vite';
//import unocssPlugin from "unocss/vite";
import tailwindcss from "@tailwindcss/vite";
import solidPlugin from 'vite-plugin-solid';
import wasmPlugin from "vite-plugin-wasm";
import mkcertPlugin from "vite-plugin-mkcert";
import dts from 'vite-plugin-dts';
import solidSvg from 'vite-plugin-solid-svg';

export default defineConfig({
  base: "",
  plugins: [
    //unocssPlugin(),
    tailwindcss(),
    solidPlugin(),
    solidSvg(),
    wasmPlugin(),
    // mkcertPlugin(),
    dts({
      insertTypesEntry: true,
      copyDtsFiles: false,
      include: [
        "./src/components/**/*.ts",
        "./src/ecs/**/*.ts",
        "./src/math/**/*.ts",
        "./src/systems/**/*.ts",
        "./src/systems/**/*.tsx",
        "./src/lib.ts",
        "./src/TypeSchema.ts",
        "./src/Cont.ts",
        "./src/cont-do.ts",
        "./src/coroutine-dsl.ts",
      ],
      outDir: "./types",
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      external: ["typescript"],
      input: [
        "index.html",
        "src/lib.ts",
        "src/lib/solid-js.ts",
        "src/lib/pixi-js.ts",
        "src/lib/solid-js-store.ts",
      ],
      output: {
        globals: {
          "typescript": "typescript",
        },
      },
      preserveEntrySignatures: "allow-extension",
    },
    assetsInlineLimit: (file) => {
      return !file.endsWith('.ts');
    },
  },
  publicDir: "public",
  resolve: {
    conditions: ['development', 'browser'],
  },
  test: {
     environment: 'jsdom',
     deps: {
       optimizer: {
         web: {
           enabled: true,
           include: ['solid-js', 'solid-js/web', 'solid-js/store'],
         },
       },
       // inline: [/solid-js/],  // this still works but is deprecated
     },
  },
});
