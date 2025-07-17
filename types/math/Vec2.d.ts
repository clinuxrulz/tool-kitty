export declare class Vec2 {
    readonly x: number;
    readonly y: number;
    private constructor();
    static create(x: number, y: number): Vec2;
    static readonly zero: Vec2;
    static readonly unitX: Vec2;
    static readonly unitY: Vec2;
    add(other: Vec2): Vec2;
    sub(other: Vec2): Vec2;
    multScalar(s: number): Vec2;
    cross(other: Vec2): number;
    distanceSquared(other: Vec2): number;
    distance(other: Vec2): number;
    lengthSquared(): number;
    length(): number;
    normalize(): Vec2;
}
