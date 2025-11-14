import { Vec2 } from "./Vec2";

export class QuadraticBezier {
  readonly start: Vec2;
  readonly end: Vec2;
  readonly controlPoint: Vec2;

  constructor(params: {
    start: Vec2,
    end: Vec2,
    controlPoint: Vec2,
  }) {
    this.start = params.start;
    this.end = params.end;
    this.controlPoint = params.controlPoint;
  }
  
}
