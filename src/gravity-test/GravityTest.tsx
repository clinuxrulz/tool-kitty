import { Component, For } from "solid-js";

const GravityTest: Component = () => {
  let p0 = 0;
  let v0 = 50;
  let a = -10;
  let heights1: number[] = [];
  // Actual formula
  {
    // p(t) = p0 + v0.t + ½.a.t²
    for (let t = 0; t <= 50; ++t) {
      let height = p0 + v0 * t + 0.5 * a * t * t;
      heights1.push(height);
    }
  }
  let heights2: number[] = [];
  // Modified Newton's Method
  {
    // p(t) = p0 + v0.t + ½.a.t²
    // p(t+1) = p0 + v0.(t+1) + ½.a.(t+1)²
    // p(t+1) = p0 + v0.t + ½.a.t² + v0 + a.t + ½.a
    // p(t+1) = p(t) + v0 + ½.a + a.t
    //
    /*
        dummy1 = v0 + ½a
        dummy2(0) = 0
        dummy2(t + 1) = dummy2(t) + a
        p(0) = p0
        p(t + 1) = p(t) + dummy1 + dummy2(t)
        */
    let halfA = 0.5 * a;
    let dummy1 = v0 + halfA;
    let dummy2 = 0;
    let height = p0;
    let t = 0;
    while (t <= 50) {
      heights2.push(height);
      ++t;
      height += dummy1 + dummy2;
      dummy2 += a;
    }
  }
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        "overflow-y": "auto",
      }}
    >
      <table
        style={{
          width: "100%",
        }}
      >
        <thead />
        <tbody>
          <tr>
            <td colSpan={2} style="border: 1px solid blue;">
              p0 = {p0}
              <br />
              v0 = {v0}
              <br />a = {a}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid blue;">
              <b>Actual Formula:</b>
              <br />
              <code>p(t) = p0 + v0.t + ½.a.t²</code>
            </td>
            <td style="border: 1px solid blue;">
              <b>Modified Newton's Method</b>
              <br />
              <code>
                dummy1 = v0 + ½a
                <br />
                dummy2(0) = 0<br />
                dummy2(t + 1) = dummy2(t) + a<br />
                p(0) = p0
                <br />
                p(t + 1) = p(t) + dummy1 + dummy2(t)
              </code>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid blue;">
              <code>
                <For each={heights1}>
                  {(height, t) => (
                    <>
                      p({t}) = {height}
                      <br />
                    </>
                  )}
                </For>
              </code>
            </td>
            <td style="border: 1px solid blue;">
              <code>
                <For each={heights2}>
                  {(height, t) => (
                    <>
                      p({t}) = {height}
                      <br />
                    </>
                  )}
                </For>
              </code>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default GravityTest;
