import { Vec2 } from './Vec2';
export declare class Complex {
    readonly x: number;
    readonly y: number;
    static rot0: Complex;
    constructor(x: number, y: number);
    static xy(xy: Vec2): Complex;
    static fromAngle(angle: number): Complex;
    get u(): Vec2;
    get v(): Vec2;
    getLengthSquared(): number;
    getLength(): number;
    normalize(): Complex;
    times(rhs: Complex): Complex;
    conjugate(): Complex;
    rotate(p: Vec2): Vec2;
    getAngle(): number;
}
