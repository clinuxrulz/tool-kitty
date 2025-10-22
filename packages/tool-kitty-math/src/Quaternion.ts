import { Vec3 } from './Vec3';

export class Quaternion {
    private _w : number;
    private _x : number;
    private _y : number;
    private _z : number;

    public static identity : Quaternion; public static identity_$LI$() : Quaternion { if(Quaternion.identity == null) Quaternion.identity = Quaternion.Builder.fromWXYZ().setWXYZ(1, 0, 0, 0).build(); return Quaternion.identity; };

    constructor(w : number, x : number, y : number, z : number) {
        this._w = w;
        this._x = x;
        this._y = y;
        this._z = z;
    }

    public static fromAxisAngle(axis : Vec3, angle : number) : Quaternion {
        return Quaternion.Builder.fromAxisAngle().setAxis(axis).setAngle(angle).build();
    }

    public static fromUV(u : Vec3, v : Vec3) : Quaternion {
        return Quaternion.Builder.fromUVW().setU(u).setV(v).setW(u.cross(v)).build();
    }

    public static fromVW(v : Vec3, w : Vec3) : Quaternion {
        return Quaternion.Builder.fromUVW().setU(v.cross(w)).setV(v).setW(w).build();
    }

    public static fromWU(w : Vec3, u : Vec3) : Quaternion {
        return Quaternion.Builder.fromUVW().setU(u).setV(w.cross(u)).setW(w).build();
    }

    public get w() : number {
        return this._w;
    }

    public get x() : number {
        return this._x;
    }

    public get y() : number {
        return this._y;
    }

    public get z() : number {
        return this._z;
    }

    public getLengthSquared() : number {
        return this.w * this.w + this.x * this.x + this.y * this.y + this.z * this.z;
    }

    public getLength() : number {
        return Math.sqrt(this.getLengthSquared());
    }

    public normalize() : Quaternion {
        let length : number = this.getLength();
        return new Quaternion(this.w / length, this.x / length, this.y / length, this.z / length);
    }

    public times(rhs : Quaternion) : Quaternion {
        let lhs : Quaternion = this;
        return new Quaternion(lhs.w * rhs.w - lhs.x * rhs.x - lhs.y * rhs.y - lhs.z * rhs.z, lhs.w * rhs.x + lhs.x * rhs.w + lhs.y * rhs.z - lhs.z * rhs.y, lhs.w * rhs.y - lhs.x * rhs.z + lhs.y * rhs.w + lhs.z * rhs.x, lhs.w * rhs.z + lhs.x * rhs.y - lhs.y * rhs.x + lhs.z * rhs.w);
    }

    public dotProduct(rhs : Quaternion) : number {
        let lhs : Quaternion = this;
        return lhs.w * rhs.w + lhs.x * rhs.x + lhs.y * rhs.y + lhs.z * rhs.z;
    }

    public conjugate() : Quaternion {
        return new Quaternion(this.w, -this.x, -this.y, -this.z);
    }

    public rotate$Quaternion(p : Quaternion) : Quaternion {
        return this.times(p).times(this.conjugate());
    }

    public rotate(p? : any) : any {
        if(((p != null && p instanceof <any>Quaternion) || p === null)) {
            return <any>this.rotate$Quaternion(p);
        } else if(((p != null && p instanceof <any>Vec3) || p === null)) {
            return <any>this.rotate$Vec3(p);
        } else throw new Error('invalid overload');
    }

    public rotate$Vec3(p : Vec3) : Vec3 {
        let pPrime : Quaternion = this.times(Quaternion.Builder.fromWXYZ().setWXYZ(0, p.x, p.y, p.z).build()).times(this.conjugate());
        return Vec3.create(pPrime.x, pPrime.y, pPrime.z);
    }

    public slerp(target : Quaternion, t : number, allowFlip : boolean) : Quaternion {
        let a : Quaternion = this;
        let b : Quaternion = target;
        let cosAngle : number = a.dotProduct(b);
        let c1 : number;
        let c2 : number;
        if((1.0 - Math.abs(cosAngle)) < 0.01) {
            c1 = 1.0 - t;
            c2 = t;
        } else {
            let angle : number = Math.acos(Math.abs(cosAngle));
            let sinAngle : number = Math.sin(angle);
            c1 = Math.sin(angle * (1.0 - t)) / sinAngle;
            c2 = Math.sin(angle * t) / sinAngle;
        }
        if(allowFlip && (cosAngle < 0.0)) {
            c1 = -c1;
        }
        return new Quaternion(c1 * a.w + c2 * b.w, c1 * a.x + c2 * b.x, c1 * a.y + c2 * b.y, c1 * a.z + c2 * b.z);
    }

    public toJSON(): any {
        return {
            w: this.w,
            x: this.x,
            y: this.y,
            z: this.z
        };
    }

    public static fromJSON(json: any): Quaternion {
        return new Quaternion(json.w, json.x, json.y, json.z);
    }

    /**
     * 
     * @return {string}
     */
    public toString() : string {
        return "Quaternion " + this.w + " " + this.x + " " + this.y + " " + this.z;
    }
}
(Quaternion as any)["__class"] = "Quaternion";


export namespace Quaternion {

    export interface FromWXYZSetWStep {
        setW(w : number) : Quaternion.FromWXYZSetXStep;

        setWXYZ(w : number, x : number, y : number, z : number) : Quaternion.BuildStep;
    }

    export interface FromWXYZSetXStep {
        setX(x : number) : Quaternion.FromWXYZSetYStep;
    }

    export interface FromWXYZSetYStep {
        setY(y : number) : Quaternion.FromWXYZSetZStep;
    }

    export interface FromWXYZSetZStep {
        setZ(z : number) : Quaternion.BuildStep;
    }

    export interface BuildStep {
        build() : Quaternion;
    }

    export class FromWXYZBuilder implements Quaternion.FromWXYZSetWStep, Quaternion.FromWXYZSetXStep, Quaternion.FromWXYZSetYStep, Quaternion.FromWXYZSetZStep, Quaternion.BuildStep {
        w : number;

        x : number;

        y : number;

        z : number;

        /**
         * 
         * @param {number} w
         * @return {*}
         */
        public setW(w : number) : Quaternion.FromWXYZSetXStep {
            this.w = w;
            return this;
        }

        /**
         * 
         * @param {number} w
         * @param {number} x
         * @param {number} y
         * @param {number} z
         * @return {*}
         */
        public setWXYZ(w : number, x : number, y : number, z : number) : Quaternion.BuildStep {
            this.w = w;
            this.x = x;
            this.y = y;
            this.z = z;
            return this;
        }

        /**
         * 
         * @param {number} x
         * @return {*}
         */
        public setX(x : number) : Quaternion.FromWXYZSetYStep {
            this.x = x;
            return this;
        }

        /**
         * 
         * @param {number} y
         * @return {*}
         */
        public setY(y : number) : Quaternion.FromWXYZSetZStep {
            this.y = y;
            return this;
        }

        /**
         * 
         * @param {number} z
         * @return {*}
         */
        public setZ(z : number) : Quaternion.BuildStep {
            this.z = z;
            return this;
        }

        /**
         * 
         * @return {Quaternion}
         */
        public build() : Quaternion {
            return new Quaternion(this.w, this.x, this.y, this.z);
        }

        constructor() {
            this.w = 0;
            this.x = 0;
            this.y = 0;
            this.z = 0;
        }
    }
    (FromWXYZBuilder as any)["__class"] = "Quaternion.FromWXYZBuilder";
    (FromWXYZBuilder as any)["__interfaces"] = ["Quaternion.BuildStep","Quaternion.FromWXYZSetWStep","Quaternion.FromWXYZSetXStep","Quaternion.FromWXYZSetZStep","Quaternion.FromWXYZSetYStep"];



    export interface FromAxisAngleSetAxisXStep {
        setAxisX(axisX : number) : Quaternion.FromAxisAngleSetAxisYStep;

        setAxisXYZ(axisX : number, axisY : number, axisZ : number) : Quaternion.FromAxisAngleSetAngleStep;

        setAxis(axis : Vec3) : Quaternion.FromAxisAngleSetAngleStep;
    }

    export interface FromAxisAngleSetAxisYStep {
        setAxisY(axisY : number) : Quaternion.FromAxisAngleSetAxisZStep;
    }

    export interface FromAxisAngleSetAxisZStep {
        setAxisZ(axisZ : number) : Quaternion.FromAxisAngleSetAngleStep;
    }

    export interface FromAxisAngleSetAngleStep {
        setAngle(angle : number) : Quaternion.BuildStep;
    }

    export class FromAxisAngleBuilder implements Quaternion.FromAxisAngleSetAxisXStep, Quaternion.FromAxisAngleSetAxisYStep, Quaternion.FromAxisAngleSetAxisZStep, Quaternion.FromAxisAngleSetAngleStep, Quaternion.BuildStep {
        axisX : number;

        axisY : number;

        axisZ : number;

        angle : number;

        /**
         * 
         * @param {number} axisX
         * @return {*}
         */
        public setAxisX(axisX : number) : Quaternion.FromAxisAngleSetAxisYStep {
            this.axisX = axisX;
            return this;
        }

        /**
         * 
         * @param {number} axisX
         * @param {number} axisY
         * @param {number} axisZ
         * @return {*}
         */
        public setAxisXYZ(axisX : number, axisY : number, axisZ : number) : Quaternion.FromAxisAngleSetAngleStep {
            this.axisX = axisX;
            this.axisY = axisY;
            this.axisZ = axisZ;
            return this;
        }

        /**
         * 
         * @param {Vec3} axis
         * @return {*}
         */
        public setAxis(axis : Vec3) : Quaternion.FromAxisAngleSetAngleStep {
            this.axisX = axis.x;
            this.axisY = axis.y;
            this.axisZ = axis.z;
            return this;
        }

        /**
         * 
         * @param {number} axisY
         * @return {*}
         */
        public setAxisY(axisY : number) : Quaternion.FromAxisAngleSetAxisZStep {
            this.axisY = axisY;
            return this;
        }

        /**
         * 
         * @param {number} axisZ
         * @return {*}
         */
        public setAxisZ(axisZ : number) : Quaternion.FromAxisAngleSetAngleStep {
            this.axisZ = axisZ;
            return this;
        }

        /**
         * 
         * @param {number} angle
         * @return {*}
         */
        public setAngle(angle : number) : Quaternion.BuildStep {
            this.angle = angle;
            return this;
        }

        /**
         * 
         * @return {Quaternion}
         */
        public build() : Quaternion {
            let len : number = Math.sqrt(this.axisX * this.axisX + this.axisY * this.axisY + this.axisZ * this.axisZ);
            this.axisX /= len;
            this.axisY /= len;
            this.axisZ /= len;
            let ca : number = Math.cos(/* toRadians */(x => x * Math.PI / 180)(0.5 * this.angle));
            let sa : number = Math.sin(/* toRadians */(x => x * Math.PI / 180)(0.5 * this.angle));
            return new Quaternion(ca, sa * this.axisX, sa * this.axisY, sa * this.axisZ);
        }

        constructor() {
            this.axisX = 0;
            this.axisY = 0;
            this.axisZ = 0;
            this.angle = 0;
        }
    }
    (FromAxisAngleBuilder as any)["__class"] = "Quaternion.FromAxisAngleBuilder";
    (FromAxisAngleBuilder as any)["__interfaces"] = ["Quaternion.FromAxisAngleSetAxisYStep","Quaternion.FromAxisAngleSetAngleStep","Quaternion.FromAxisAngleSetAxisXStep","Quaternion.BuildStep","Quaternion.FromAxisAngleSetAxisZStep"];



    export interface FromUVWSetUStep {
        setU(u : Vec3) : Quaternion.FromUVWSetVStep;
    }

    export interface FromUVWSetVStep {
        setV(v : Vec3) : Quaternion.FromUVWSetWStep;
    }

    export interface FromUVWSetWStep {
        setW(w : Vec3) : Quaternion.BuildStep;
    }

    export class FromUVWBuilder implements Quaternion.FromUVWSetUStep, Quaternion.FromUVWSetVStep, Quaternion.FromUVWSetWStep, Quaternion.BuildStep {
        u : Vec3 | null;

        v : Vec3 | null;

        w : Vec3 | null;

        /**
         * 
         * @param {Vec3} u
         * @return {*}
         */
        public setU(u : Vec3) : Quaternion.FromUVWSetVStep {
            this.u = u;
            return this;
        }

        /**
         * 
         * @param {Vec3} v
         * @return {*}
         */
        public setV(v : Vec3) : Quaternion.FromUVWSetWStep {
            this.v = v;
            return this;
        }

        /**
         * 
         * @param {Vec3} w
         * @return {*}
         */
        public setW(w : Vec3) : Quaternion.BuildStep {
            this.w = w;
            return this;
        }

        /**
         * 
         * @return {Quaternion}
         */
        public build() : Quaternion {
            if (this.u == null || this.v == null || this.w == null) {
                throw "Fields not all set";
            }
            let m00 : number = this.u.x;
            let m10 : number = this.u.y;
            let m20 : number = this.u.z;
            let m01 : number = this.v.x;
            let m11 : number = this.v.y;
            let m21 : number = this.v.z;
            let m02 : number = this.w.x;
            let m12 : number = this.w.y;
            let m22 : number = this.w.z;
            let tr : number = m00 + m11 + m22;
            let qw : number;
            let qx : number;
            let qy : number;
            let qz : number;
            if(tr > 0) {
                let S : number = Math.sqrt(tr + 1.0) * 2;
                qw = 0.25 * S;
                qx = (m21 - m12) / S;
                qy = (m02 - m20) / S;
                qz = (m10 - m01) / S;
            } else if(((lhs, rhs) => lhs && rhs)((m00 > m11), (m00 > m22))) {
                let S : number = Math.sqrt(1.0 + m00 - m11 - m22) * 2;
                qw = (m21 - m12) / S;
                qx = 0.25 * S;
                qy = (m01 + m10) / S;
                qz = (m02 + m20) / S;
            } else if(m11 > m22) {
                let S : number = Math.sqrt(1.0 + m11 - m00 - m22) * 2;
                qw = (m02 - m20) / S;
                qx = (m01 + m10) / S;
                qy = 0.25 * S;
                qz = (m12 + m21) / S;
            } else {
                let S : number = Math.sqrt(1.0 + m22 - m00 - m11) * 2;
                qw = (m10 - m01) / S;
                qx = (m02 + m20) / S;
                qy = (m12 + m21) / S;
                qz = 0.25 * S;
            }
            return new Quaternion(qw, qx, qy, qz);
        }

        constructor() {
            this.u = null;
            this.v = null;
            this.w = null;
        }
    }
    (FromUVWBuilder as any)["__class"] = "Quaternion.FromUVWBuilder";
    (FromUVWBuilder as any)["__interfaces"] = ["Quaternion.FromUVWSetUStep","Quaternion.BuildStep","Quaternion.FromUVWSetWStep","Quaternion.FromUVWSetVStep"];



    export class Builder {
        public static fromWXYZ() : Quaternion.FromWXYZSetWStep {
            return new Quaternion.FromWXYZBuilder();
        }

        public static fromAxisAngle() : Quaternion.FromAxisAngleSetAxisXStep {
            return new Quaternion.FromAxisAngleBuilder();
        }

        public static fromUVW() : Quaternion.FromUVWSetUStep {
            return new Quaternion.FromUVWBuilder();
        }

        constructor() {
        }
    }
    (Builder as any)["__class"] = "Quaternion.Builder";

}

Quaternion.identity_$LI$();
