import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{html,js,jsx,ts,tsx}",
    "./public/index.html",
    "./packages/tool-kitty-node-editor/src/**/*.{html,js,jsx,ts,tsx}",
  ],
};

export default config;
