import { Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import { Quaternion, Transform3D, Vec3 } from "tool-kitty-math";
import { Vec2 } from "../../../src/lib";
import { NoTrack } from "tool-kitty-util";

export class OrbitalCamera {
  readonly space: Accessor<Transform3D>;
  readonly pointerDown: (e: PointerEvent) => void;
  readonly pointerUp: (e: PointerEvent) => void;
  readonly pointerMove: (e: PointerEvent) => void;

  constructor(params: {
    initSpace: Transform3D,
    initOrbitTarget: Vec3,
  }) {
    let [ state, setState, ] = createStore<{
      space: Transform3D,
      orbitTarget: Vec3,
      orbiting: NoTrack<{
        pointerId: number,
        startPoint: Vec2,
        startOrigin: Vec3,
      }> | undefined,
    }>({
      space: params.initSpace,
      orbitTarget: params.initOrbitTarget,
      orbiting: undefined,
    });
    this.space = () => state.space;
    this.pointerDown = (e) => {
      if (!state.orbiting) {
        setState("orbiting", new NoTrack({
          pointerId: e.pointerId,
          startPoint: Vec2.create(e.clientX, e.clientY),
          startOrigin: state.space.origin,
        }));
      }
    };
    this.pointerUp = (e) => {
      if (state.orbiting != undefined && e.pointerId == e.pointerId) {
        setState("orbiting", undefined);
      }
    };
    this.pointerMove = (e) => {
      if (state.orbiting) {
        let orbiting = state.orbiting.value;
        let dx = e.clientX - orbiting.startPoint.x;
        let dy = e.clientY - orbiting.startPoint.y;
        let q1 = Quaternion.fromAxisAngle(Vec3.unitY, -dx);
        let d = q1.rotate$Vec3(orbiting.startOrigin.sub(state.orbitTarget));
        let u = Vec3.create(d.z, 0.0, -d.x).normalize();
        let q2 = Quaternion.fromAxisAngle(u, -dy);
        d = q2.rotate$Vec3(d);
        let newOrigin = d.add(state.orbitTarget);
        let w = d.normalize();
        u = Vec3.unitY.cross(w).normalize();
        let newSpace = Transform3D.create(
          newOrigin,
          Quaternion.fromWU(w,u),
        );
        setState("space", newSpace);
      }
    };
  }

  writeGLInverseViewMatrix(m: Float32Array) {
    let space2 = this.space();
    let u = space2.u;
    let v = space2.v;
    let w = space2.w;
    let o = space2.o;
    // [ ux vx wx ox ]   [ x ]
    // [ uy vy wy oy ] x [ y ]
    // [ uz vz wz oz ]   [ z ]
    // [  0  0  0  1 ]   [ 1 ]
    m[0] = u.x; m[4] = v.x;  m[8] = w.x; m[12] = o.x;
    m[1] = u.y; m[5] = v.y;  m[9] = w.y; m[13] = o.y;
    m[2] = u.z; m[6] = v.z; m[10] = w.z; m[14] = o.z;
    m[3] = 0.0; m[7] = 0.0; m[11] = 0.0; m[15] = 1.0;
  }
}
