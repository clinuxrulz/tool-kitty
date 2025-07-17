import { Component, createMemo, For, Index, JSX, Show } from "solid-js";
import { EcsWorld } from "../../ecs/EcsWorld";
import {
  catmullRomSplineComponentType,
  CatmullRomSplineState,
} from "../components/CatmullRomSplineComponent";
import { EcsComponent } from "../../ecs/EcsComponent";
import { nurbsComponentType, NurbsState } from "../components/NurbsComponent";
import { Vec2 } from "../../math/Vec2";
// @ts-ignore
import nurbs from "nurbs";

export class RenderSystem {
  Render: Component;

  constructor(params: { world: EcsWorld }) {
    let entities = createMemo(() => params.world.entities());
    this.Render = () => (
      <For each={entities()}>
        {(entity) => {
          let result: JSX.Element[] = [];
          let components = params.world.getComponents(entity);
          for (let component of components) {
            switch (component.type.typeName) {
              case catmullRomSplineComponentType.typeName: {
                let catmullRomSplineState = (
                  component as EcsComponent<CatmullRomSplineState>
                ).state;
                result.push(
                  <RenderCatmullRomSpline state={catmullRomSplineState} />,
                );
                break;
              }
              case nurbsComponentType.typeName:
                let nurbsState = (component as EcsComponent<NurbsState>).state;
                result.push(<RenderNurbs state={nurbsState} />);
                break;
            }
          }
          return result;
        }}
      </For>
    );
  }
}

const RenderCatmullRomSpline: Component<{
  state: CatmullRomSplineState;
}> = (props) => {
  let pathString = createMemo(() => {
    let d = romPointsToPathData(
      props.state.controlPoints.map((pt) => [pt.x, pt.y]),
      props.state.isClosed,
    );
    return d.map((part) => part.type + " " + part.values.join(" ")).join(" ");
  });
  return (
    <>
      <path d={pathString()} stroke="black" stroke-width="2" fill="none" />
      <Index each={props.state.controlPoints}>
        {(pt) => (
          <circle
            cx={pt().x}
            cy={pt().y}
            r={8}
            stroke="red"
            stroke-width={1}
            fill="none"
          />
        )}
      </Index>
    </>
  );
};

const EPSILON = 1e-12;

// Converts a Catmull-Rom spline defined by control points into SVG paths.
export function romPointsToPathData(
  points: [number, number][],
  closed: boolean = false,
  alpha: number = 0.5,
): {
  type: string;
  values: number[];
}[] {
  let pathData;

  // Determine if the curve should be closed or open and call the appropriate function.
  if (closed) {
    pathData = closedRomCurveToPathData(points, alpha);
  } else {
    pathData = openRomCurveToPathData(points, alpha);
  }

  return pathData;
}

function rotateArray<A>(array: A[], reverse = false): A[] {
  // Check if the array is empty.
  if (array.length == 0) {
    return array;
  }
  // Rotate the array to the left if reverse is true, otherwise rotate to the right.
  if (reverse) {
    array.unshift(array.pop()!); // Move the last element to the beginning.
  } else {
    array.push(array.shift()!); // Move the first element to the end.
  }

  return array;
}

// Get SVG path data for a open Catmull-Rom spline with given control points.
function openRomCurveToPathData(
  points: [number, number][],
  alpha: number,
): { type: string; values: number[] }[] {
  let pathData: {
    type: string;
    values: number[];
  }[] = [];
  let defined = false; // Flag to check if the path has started.
  let canClose = false; // Flag to check if the path can be closed.

  let x0: number, y0: number; // Previous point.
  let x1: number, y1: number; // Current point.
  let x2: number, y2: number; // Next point.

  let l01a: number, l12a: number, l23a: number; // Distances between points raised to alpha.
  let l01a2: number, l12a2: number, l23a2: number; // Squared distances between points raised to alpha.

  let pointFlag: number; // Flag to track the number of points processed.
  let lineFlag: number; // Flag to track if the line is started.

  let startLine = () => {
    // Reset distance variables.
    l01a = 0;
    l12a = 0;
    l23a = 0;
    l01a2 = 0;
    l12a2 = 0;
    l23a2 = 0;
    pointFlag = 0; // Reset point flag.
  };

  let endLine = () => {
    // Handle the end of the line segment based on the number of points processed.
    if (pointFlag === 2) {
      canClose = true;
      pathData.push({ type: "L", values: [x2, y2] }); // Add a line to the last point.
    } else if (pointFlag === 3) {
      addPoint(x2, y2); // Add the last point to the curve.
    }

    // Handle closing the path if necessary.
    if (lineFlag || (lineFlag !== 0 && pointFlag === 1)) {
      if (canClose) {
        pathData.push({ type: "Z", values: [] }); // Close the path.
      }
    }

    lineFlag = 1 - lineFlag; // Toggle the line flag.
  };

  let addPoint = (x: number, y: number) => {
    // Calculate distances between points.
    if (pointFlag) {
      let x23 = x2 - x;
      let y23 = y2 - y;

      l23a2 = Math.pow(x23 * x23 + y23 * y23, alpha);
      l23a = Math.sqrt(l23a2);
    }

    // Handle adding points to the path based on the number of points processed.
    if (pointFlag === 0) {
      pointFlag = 1;

      if (lineFlag) {
        canClose = true;
        pathData.push({ type: "L", values: [x, y] }); // Add a line to the first point.
      } else {
        canClose = true;
        pathData.push({ type: "M", values: [x, y] }); // Move to the first point.
      }
    } else if (pointFlag === 1) {
      pointFlag = 2;
    } else {
      if (pointFlag === 2) {
        pointFlag = 3;
      }

      let cx1 = x1; // First control point x.
      let cy1 = y1; // First control point y.
      let cx2 = x2; // Second control point x.
      let cy2 = y2; // Second control point y.

      // Calculate control points for the cubic Bezier curve.
      if (l01a > EPSILON) {
        let a = 2 * l01a2 + 3 * l01a * l12a + l12a2;
        let n = 3 * l01a * (l01a + l12a);

        cx1 = (cx1 * a - x0 * l12a2 + x2 * l01a2) / n;
        cy1 = (cy1 * a - y0 * l12a2 + y2 * l01a2) / n;
      }

      if (l23a > EPSILON) {
        let b = 2 * l23a2 + 3 * l23a * l12a + l12a2;
        let m = 3 * l23a * (l23a + l12a);

        cx2 = (cx2 * b + x1 * l23a2 - x * l12a2) / m;
        cy2 = (cy2 * b + y1 * l23a2 - y * l12a2) / m;
      }

      canClose = true;
      pathData.push({ type: "C", values: [cx1, cy1, cx2, cy2, x2, y2] }); // Add a cubic Bezier curve.
    }

    // Update distance and point variables.
    l01a = l12a;
    l12a = l23a;
    l01a2 = l12a2;
    l12a2 = l23a2;

    x0 = x1;
    x1 = x2;
    x2 = x;
    y0 = y1;
    y1 = y2;
    y2 = y;
  };

  // Iterate through the points and add them to the path.
  for (let i = 0, n = points.length; i <= n; i += 1) {
    if (i < n) {
      if (defined === false) {
        defined = true;
        startLine();
      }

      addPoint(points[i][0], points[i][1]);
    } else {
      if (defined === true) {
        defined = false;
        endLine();
      }
    }
  }

  return pathData;
}

// Get SVG path data for a closed Catmull-Rom spline with given control points.
function closedRomCurveToPathData(
  points: [number, number][],
  alpha: number = 0.5,
): { type: string; values: number[] }[] {
  let pathData: {
    type: string;
    values: number[];
  }[] = [];
  let defined = false; // Flag to track if the path has started.
  let canClose = false; // Flag to track if the path can be closed.

  let x0: number, y0: number; // Previous point.
  let x1: number, y1: number; // Current point.
  let x2: number, y2: number; // Next point.
  let x3: number, y3: number; // First point of the closed loop (stored from the first point).
  let x4: number, y4: number; // Second point of the closed loop (stored from the second point).
  let x5: number, y5: number; // Third point of the closed loop (stored from the third point).

  let l01a: number, l12a: number, l23a: number; // Distances between points raised to alpha.
  let l012a: number, l122a: number, l232a: number; // Squared distances between points raised to alpha.

  let pointFlag: number; // Flag to track the number of points processed.

  let startLine = () => {
    // Reset distance variables.
    l01a = 0;
    l12a = 0;
    l23a = 0;
    l012a = 0;
    l122a = 0;
    l232a = 0;
    pointFlag = 0; // Reset point flag.
  };

  let endLine = () => {
    // Handle the end of the line segment based on the number of points processed.
    if (pointFlag === 1) {
      // If only one point, move to it and close the path.
      pathData.push({ type: "M", values: [x3, y3] }, { type: "Z", values: [] });
    } else if (pointFlag === 2) {
      // If two points, draw a line to the second and close the path.
      pathData.push({ type: "L", values: [x3, y3] }, { type: "Z", values: [] });
    } else if (pointFlag === 3) {
      // If three or more points, add the last three points to the curve.
      addPoint(x3, y3);
      addPoint(x4, y4);
      addPoint(x5, y5);
    }
  };

  let addPoint = (x: number, y: number) => {
    // Calculate distances between points.
    if (pointFlag) {
      let x23 = x2 - x;
      let y23 = y2 - y;

      l232a = Math.pow(x23 * x23 + y23 * y23, alpha);
      l23a = Math.sqrt(l232a);
    }

    // Handle adding points to the path based on the number of points processed.
    if (pointFlag === 0) {
      pointFlag = 1;
      x3 = x; // Store the first point of the closed loop.
      y3 = y;
    } else if (pointFlag === 1) {
      pointFlag = 2;
      x4 = x; // Store the second point of the closed loop.
      y4 = y;

      canClose = true;
      pathData.push({ type: "M", values: [x4, y4] }); // Move to the second point.
    } else if (pointFlag === 2) {
      pointFlag = 3;
      x5 = x; // Store the third point of the closed loop.
      y5 = y;
    } else {
      let cx1 = x1; // First control point x.
      let cy1 = y1; // First control point y.
      let cx2 = x2; // Second control point x.
      let cy2 = y2; // Second control point y.

      // Calculate control points for the cubic Bezier curve.
      if (l01a > EPSILON) {
        let a = 2 * l012a + 3 * l01a * l12a + l122a;
        let n = 3 * l01a * (l01a + l12a);

        cx1 = (cx1 * a - x0 * l122a + x2 * l012a) / n;
        cy1 = (cy1 * a - y0 * l122a + y2 * l012a) / n;
      }

      if (l23a > EPSILON) {
        let b = 2 * l232a + 3 * l23a * l12a + l122a;
        let m = 3 * l23a * (l23a + l12a);

        cx2 = (cx2 * b + x1 * l232a - x * l122a) / m;
        cy2 = (cy2 * b + y1 * l232a - y * l122a) / m;
      }

      canClose = true;
      pathData.push({ type: "C", values: [cx1, cy1, cx2, cy2, x2, y2] }); // Add a cubic Bezier curve.
    }

    // Update distance and point variables.
    l01a = l12a;
    l12a = l23a;
    l012a = l122a;
    l122a = l232a;

    x0 = x1;
    x1 = x2;
    x2 = x;
    y0 = y1;
    y1 = y2;
    y2 = y;
  };

  // Rotate the array to start with the last point, ensuring closure.
  points = rotateArray(points, true);

  // Iterate through the points and add them to the path.
  for (let i = 0, n = points.length; i <= n; i += 1) {
    if (i < n) {
      if (defined === false) {
        defined = true;
        startLine();
      }

      addPoint(points[i][0], points[i][1]);
    } else {
      if (defined === true) {
        defined = false;
        endLine();
      }
    }
  }

  return pathData;
}

const RenderNurbs: Component<{
  state: NurbsState;
}> = (props) => {
  let pathString = createMemo(() => {
    let state = props.state;
    if (state.controlPoints.length < 4) {
      return undefined;
    }
    let catmullRomControlPoints: Vec2[] = [];
    let n = state.controlPoints.length * 10;
    let curve = nurbs({
      points: state.controlPoints.map((x) => [x.x, x.y]),
      degree: state.degree,
      boundary: state.closed ? "closed" : "clamped",
    });
    let domain = curve.domain[0];
    for (let i = 0; i <= n; ++i) {
      let t = i / n;
      let p = curve.evaluate({}, (domain[1] - domain[0]) * t + domain[0]);
      catmullRomControlPoints.push(Vec2.create(p[0], p[1]));
    }
    let d = romPointsToPathData(
      catmullRomControlPoints.map((pt) => [pt.x, pt.y]),
      false,
    );
    return d.map((part) => part.type + " " + part.values.join(" ")).join(" ");
  });
  return (
    <Show when={pathString()}>
      {(pathString2) => (
        <>
          <path d={pathString2()} stroke="black" stroke-width="2" fill="none" />
          <Index each={props.state.controlPoints}>
            {(pt) => (
              <circle
                cx={pt().x}
                cy={pt().y}
                r={8}
                stroke="red"
                stroke-width={1}
                fill="none"
              />
            )}
          </Index>
        </>
      )}
    </Show>
  );
};
