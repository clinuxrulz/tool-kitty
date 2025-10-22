import { Vec3 } from './Vec3';
import { Quaternion } from './Quaternion';

export class Transform3D {
    private _origin : Vec3;

    private _orientation : Quaternion;

    public static identity : Transform3D; public static identity_$LI$() : Transform3D { if(Transform3D.identity == null) Transform3D.identity = Transform3D.Builder.fromOriginOrientation().setOrigin(Vec3.zero_$LI$()).setOrientation(Quaternion.identity_$LI$()).build(); return Transform3D.identity; };

    constructor(origin : Vec3, orientation : Quaternion) {
        this._origin = origin;
        this._orientation = orientation;
    }

    public static create(origin : Vec3, orientation : Quaternion) : Transform3D {
        return new Transform3D(origin, orientation);
    }

    public get origin(): Vec3 {
        return this._origin;
    }

    public get orientation(): Quaternion {
        return this._orientation;
    }

    public get o() : Vec3 {
        return this.origin;
    }

    public get u() : Vec3 {
        return this.orientation.rotate$Vec3(Vec3.unitX_$LI$());
    }

    public get v() : Vec3 {
        return this.orientation.rotate$Vec3(Vec3.unitY_$LI$());
    }

    public get w() : Vec3 {
        return this.orientation.rotate$Vec3(Vec3.unitZ_$LI$());
    }

    public pointToThisSpace(p : Vec3) : Vec3 {
        return this.orientation.conjugate().rotate$Vec3(p.sub(this.origin));
    }

    public vectorToThisSpace(v : Vec3) : Vec3 {
        return this.orientation.conjugate().rotate$Vec3(v);
    }

    public toThisSpace(axes : Transform3D) : Transform3D {
        return Transform3D.Builder.fromOriginOrientation().setOrigin(this.pointToThisSpace(axes.origin)).setOrientation(this.orientation.conjugate().times(axes.orientation)).build();
    }

    public pointFromThisSpace(p : Vec3) : Vec3 {
        return this.orientation.rotate$Vec3(p).add(this.origin);
    }

    public vectorFromThisSpace(v : Vec3) : Vec3 {
        return this.orientation.rotate$Vec3(v);
    }

    public fromThisSpace(axes : Transform3D) : Transform3D {
        return Transform3D.Builder.fromOriginOrientation().setOrigin(this.pointFromThisSpace(axes.origin)).setOrientation(this.orientation.times(axes.orientation)).build();
    }

    public invert() : Transform3D {
        return Transform3D.Builder.fromOriginOrientation().setOrigin(this.orientation.conjugate().rotate$Vec3(this.origin.scale(-1.0))).setOrientation(this.orientation.conjugate()).build();
    }

    public times(axes : Transform3D) : Transform3D {
        return this.fromThisSpace(axes);
    }

    public toJSON(): any {
        return {
            origin: this.origin,
            orientation: this.orientation
        };
    }

    public static fromJSON(json: any): Transform3D {
        return Transform3D.create(
            Vec3.fromJSON(json.origin),
            Quaternion.fromJSON(json.orientation)
        );
    }

    /**
     * 
     * @return {string}
     */
    public toString() : string {
        return "(origin:" + this.origin.toString() + ", orientation: " + this.orientation.toString() + ")";
    }
}
(Transform3D as any)["__class"] = "Transform3D";


export namespace Transform3D {

    export interface FromOriginOrientationSetOriginXStep {
        setOrigin(origin : Vec3) : Transform3D.FromOriginOrientationSetOrientationStep;

        setOriginX(originX : number) : Transform3D.FromOriginOrientationSetOriginYStep;

        setOriginXYZ(originX : number, originY : number, originZ : number) : Transform3D.FromOriginOrientationSetOrientationStep;
    }

    export interface FromOriginOrientationSetOriginYStep {
        setOriginY(originY : number) : Transform3D.FromOriginOrientationSetOriginZStep;
    }

    export interface FromOriginOrientationSetOriginZStep {
        setOriginZ(originZ : number) : Transform3D.FromOriginOrientationSetOrientationStep;
    }

    export interface FromOriginOrientationSetOrientationStep {
        setOrientation(orientation : Quaternion) : Transform3D.BuildStep;
    }

    export interface BuildStep {
        build() : Transform3D;
    }

    export class FromOriginOrientationBuilder implements Transform3D.FromOriginOrientationSetOriginXStep, Transform3D.FromOriginOrientationSetOriginYStep, Transform3D.FromOriginOrientationSetOriginZStep, Transform3D.FromOriginOrientationSetOrientationStep, Transform3D.BuildStep {
        originX : number;

        originY : number;

        originZ : number;

        orientation : Quaternion | null;

        /**
         * 
         * @param {Vec3} origin
         * @return {*}
         */
        public setOrigin(origin : Vec3) : Transform3D.FromOriginOrientationSetOrientationStep {
            this.originX = origin.x;
            this.originY = origin.y;
            this.originZ = origin.z;
            return this;
        }

        /**
         * 
         * @param {number} originX
         * @return {*}
         */
        public setOriginX(originX : number) : Transform3D.FromOriginOrientationSetOriginYStep {
            this.originX = originX;
            return this;
        }

        /**
         * 
         * @param {number} originX
         * @param {number} originY
         * @param {number} originZ
         * @return {*}
         */
        public setOriginXYZ(originX : number, originY : number, originZ : number) : Transform3D.FromOriginOrientationSetOrientationStep {
            this.originX = originX;
            this.originY = originY;
            this.originZ = originZ;
            return this;
        }

        /**
         * 
         * @param {number} originY
         * @return {*}
         */
        public setOriginY(originY : number) : Transform3D.FromOriginOrientationSetOriginZStep {
            this.originY = originY;
            return this;
        }

        /**
         * 
         * @param {number} originZ
         * @return {*}
         */
        public setOriginZ(originZ : number) : Transform3D.FromOriginOrientationSetOrientationStep {
            this.originZ = originZ;
            return this;
        }

        /**
         * 
         * @param {Quaternion} orientation
         * @return {*}
         */
        public setOrientation(orientation : Quaternion) : Transform3D.BuildStep {
            this.orientation = orientation;
            return this;
        }

        /**
         * 
         * @return {Transform3D}
         */
        public build() : Transform3D {
            if (this.orientation == null) {
                throw "Fields not all set";
            }
            return new Transform3D(Vec3.create(this.originX, this.originY, this.originZ), this.orientation);
        }

        constructor() {
            this.originX = 0;
            this.originY = 0;
            this.originZ = 0;
            this.orientation = null;
        }
    }
    (FromOriginOrientationBuilder as any)["__class"] = "Transform3D.FromOriginOrientationBuilder";
    (FromOriginOrientationBuilder as any)["__interfaces"] = ["Transform3D.FromOriginOrientationSetOriginYStep","Transform3D.FromOriginOrientationSetOrientationStep","Transform3D.FromOriginOrientationSetOriginXStep","Transform3D.BuildStep","Transform3D.FromOriginOrientationSetOriginZStep"];



    export class Builder {
        public static fromOriginOrientation() : Transform3D.FromOriginOrientationSetOriginXStep {
            return new Transform3D.FromOriginOrientationBuilder();
        }

        constructor() {
        }
    }
    (Builder as any)["__class"] = "Transform3D.Builder";

}

Transform3D.identity_$LI$();
