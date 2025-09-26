import { Component, createComputed, createMemo, createSignal, on } from "solid-js";

const Waterfall: Component<{
}> = (props) => {
  let [ canvas, setCanvas, ] = createSignal<HTMLCanvasElement>();
  let gl = createMemo(() => canvas()?.getContext("webgl"));
  return (
    <canvas ref={setCanvas} width="100%" height="100%"/>
  );
}
