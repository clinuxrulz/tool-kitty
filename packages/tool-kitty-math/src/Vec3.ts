import { Vec2 } from './Vec2';

export class Vec3 {
    private _x : number;
    private _y : number;
    private _z : number;

    public static zero : Vec3; public static zero_$LI$() : Vec3 { if(Vec3.zero == null) Vec3.zero = Vec3.create(0, 0, 0); return Vec3.zero; };
    public static unitX : Vec3; public static unitX_$LI$() : Vec3 { if(Vec3.unitX == null) Vec3.unitX = Vec3.create(1, 0, 0); return Vec3.unitX; };
    public static unitY : Vec3; public static unitY_$LI$() : Vec3 { if(Vec3.unitY == null) Vec3.unitY = Vec3.create(0, 1, 0); return Vec3.unitY; };
    public static unitZ : Vec3; public static unitZ_$LI$() : Vec3 { if(Vec3.unitZ == null) Vec3.unitZ = Vec3.create(0, 0, 1); return Vec3.unitZ; };
    public static negUnitX : Vec3; public static negUnitX_$LI$() : Vec3 { if(Vec3.negUnitX == null) Vec3.negUnitX = Vec3.create(-1, 0, 0); return Vec3.negUnitX; };
    public static negUnitY : Vec3; public static negUnitY_$LI$() : Vec3 { if(Vec3.negUnitY == null) Vec3.negUnitY = Vec3.create(0, -1, 0); return Vec3.negUnitY; };
    public static negUnitZ : Vec3; public static negUnitZ_$LI$() : Vec3 { if(Vec3.negUnitZ == null) Vec3.negUnitZ = Vec3.create(0, 0, -1); return Vec3.negUnitZ; };

    constructor(x : number, y : number, z : number) {
        this._x = x;
        this._y = y;
        this._z = z;
    }

    public static create(x : number, y : number, z : number) : Vec3 {
        return new Vec3(x, y, z);
    }

    public get x(): number {
        return this._x;
    }

    public get y(): number {
        return this._y;
    }

    public get z(): number {
        return this._z;
    }

    public xy(): Vec2 {
        return Vec2.create(this._x, this._y);
    }

    public xz(): Vec2 {
        return Vec2.create(this._x, this._z);
    }

    public dot(v : Vec3) : number {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    public add(v : Vec3) : Vec3 {
        return Vec3.create(this.x + v.x, this.y + v.y, this.z + v.z);
    }

    public sub(v : Vec3) : Vec3 {
        return Vec3.create(this.x - v.x, this.y - v.y, this.z - v.z);
    }

    public scale(a : number) : Vec3 {
        return Vec3.create(this.x * a, this.y * a, this.z * a);
    }

    public negate(): Vec3 {
        return Vec3.create(-this.x, -this.y, -this.z);
    }

    public cross(v : Vec3) : Vec3 {
        return Vec3.create(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x);
    }

    public normalize() : Vec3 {
        let a : number = this.length();
        return Vec3.create(this.x / a, this.y / a, this.z / a);
    }

    public lengthSquared() : number {
        return this.dot(this);
    }

    public length() : number {
        return Math.sqrt(this.lengthSquared());
    }

    public distanceSquared(v : Vec3) : number {
        let dx : number = this.x - v.x;
        let dy : number = this.y - v.y;
        let dz : number = this.z - v.z;
        return dx * dx + dy * dy + dz * dz;
    }

    public distance(v : Vec3) : number {
        return Math.sqrt(this.distanceSquared(v));
    }

    public lerp(pt: Vec3, t: number) : Vec3 {
        return Vec3.create(
            this.x + (pt.x - this.x) * t,
            this.y + (pt.y - this.y) * t,
            this.z + (pt.z - this.z) * t,
        );
    }

    public toJSON(): any {
        return {
            x: this.x,
            y: this.y,
            z: this.z
        };
    }

    public static fromJSON(json: any): Vec3 {
        return Vec3.create(json.x, json.y, json.z);
    }

    /**
     * 
     * @return {string}
     */
    public toString() : string {
        return "(" + /* toString */(''+(this.x)) + ", " + /* toString */(''+(this.y)) + ", " + /* toString */(''+(this.z)) + ")";
    }
}

Vec3.negUnitZ_$LI$();

Vec3.negUnitY_$LI$();

Vec3.negUnitX_$LI$();

Vec3.unitZ_$LI$();

Vec3.unitY_$LI$();

Vec3.unitX_$LI$();

Vec3.zero_$LI$();
