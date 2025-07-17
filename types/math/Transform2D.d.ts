import { Vec2 } from './Vec2';
import { Complex } from './Complex';
export declare class Transform2D {
    readonly origin: Vec2;
    readonly orientation: Complex;
    static readonly identity: Transform2D;
    constructor(origin: Vec2, orientation: Complex);
    static create(origin: Vec2, orientation: Complex): Transform2D;
    get u(): Vec2;
    get v(): Vec2;
    pointFromSpace(p: Vec2): Vec2;
    pointToSpace(p: Vec2): Vec2;
    vectorFromSpace(v: Vec2): Vec2;
    vectorToSpace(v: Vec2): Vec2;
    transformFromSpace(a: Transform2D): Transform2D;
    transformToSpace(a: Transform2D): Transform2D;
}
