import { Accessor, Component, ComponentProps, createMemo, splitProps } from "solid-js";
import { createStore } from "solid-js/store";
import { Overwrite } from "tool-kitty-util";

const MarchingCubes: Component<
  Overwrite<
    ComponentProps<"div">,
    {
      sdf: (x: number, y: number, z: number) => number,
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
  let [ props, rest, ] = splitProps(_props, ["sdf"]);
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
  return (
    <div {...rest}>
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
    </div>
  );
};

export default MarchingCubes;
