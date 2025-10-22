import { Transform3D } from './Transform3D';
import { Vec3 } from './Vec3';
import { Plane3D } from './Plane3D';

export class Ray3D {
    private _origin: Vec3;
    private _direction: Vec3;

    private constructor(origin: Vec3, direction: Vec3) {
        this._origin = origin;
        this._direction = direction;
    }

    public static create(origin: Vec3, direction: Vec3) {
        return new Ray3D(origin, direction);
    }

    public get origin(): Vec3 {
        return this._origin;
    }

    public get direction(): Vec3 {
        return this._direction;
    }

    public positionFromTime(t: number): Vec3 {
        return this.origin.add(this.direction.scale(t));
    }
    
    public closestTimeToPoint(p : Vec3) : number {
        return this.direction.dot(p.sub(this.origin)) / this.direction.dot(this.direction);
    }

    public closestPoint(p : Vec3) : Vec3 {
        let t : number = this.closestTimeToPoint(p);
        return this.direction.scale(t).add(this.origin);
    }

    public distanceFromPoint(p : Vec3) : number {
        return this.closestPoint(p).distance(p);
    }

    public collisionTimeWithPlane(plane: Plane3D): number | undefined {
        // (ro + rd.t).n + d = 0
        // ro.n + rd.n.t + d = 0
        // rd.n.t = -(ro.n + d)
        // t = -(ro.n + d) / (rd.n)
        var t = -(this.origin.dot(plane.n) + plane.d) / (this.direction.dot(plane.n));
        if (!isFinite(t)) {
            return undefined;
        }
        return t;
    }

    public collisionWithPlane(plane: Plane3D): Vec3 | undefined {
        let t = this.collisionTimeWithPlane(plane);
        if (t == undefined) {
            return undefined;
        }
        return this.positionFromTime(t);
    }

    public static closestTimeOnRay1ToRay2(ray1 : Ray3D, ray2 : Ray3D) : number | undefined {
        let ro1 : Vec3 = ray1.origin;
        let rd1 : Vec3 = ray1.direction;
        let ro2 : Vec3 = ray2.origin;
        let rd2 : Vec3 = ray2.direction;
        let a : Vec3 = rd1.sub(rd2.scale(rd1.dot(rd2) / rd2.dot(rd2)));
        let b : Vec3 = ro1.sub(ro2).sub(rd2.scale(ro1.sub(ro2).dot(rd2) / rd2.dot(rd2)));
        let t : number = -a.dot(b) / a.dot(a);
        if(/* isNaN */isNaN(t) || /* isInfinite */((value) => Number.NEGATIVE_INFINITY === value || Number.POSITIVE_INFINITY === value)(t)) {
            return undefined;
        }
        return t;
    }

    public closestTimeOnThisRayWithOtherRay(otherRay : Ray3D) : number | undefined {
        return Ray3D.closestTimeOnRay1ToRay2(this, otherRay);
    }

    public fromSpace(axes: Transform3D): Ray3D {
        return Ray3D.create(axes.pointFromThisSpace(this.origin), axes.vectorFromThisSpace(this.direction));
    }

    public toSpace(axes: Transform3D): Ray3D {
        return Ray3D.create(axes.pointToThisSpace(this.origin), axes.vectorToThisSpace(this.direction));
    }

    public toString() : string {
        return "(origin: " + this.origin.toString() + ", direction: " + this.direction.toString() + ")";
    }
}
