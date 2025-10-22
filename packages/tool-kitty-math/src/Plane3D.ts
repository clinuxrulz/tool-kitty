import { Transform3D } from './Transform3D';
import { Vec3 } from './Vec3';

export class Plane3D {
    private _n: Vec3;
    private _d: number;

    private constructor(n: Vec3, d: number) {
        this._n = n;
        this._d = d;
    }

    public static create(n: Vec3, d: number): Plane3D {
        return new Plane3D(n, d);
    }

    public static fromKnownPtAndNormal(knownPt: Vec3, normal: Vec3): Plane3D {
        return Plane3D.create(normal, -normal.dot(knownPt));
    }

    public get n(): Vec3 {
        return this._n;
    }

    public get d(): number {
        return this._d;
    }

    public moveInNormalDirection(dist : number) : Plane3D {
        return new Plane3D(this.n, this.d - dist * this.n.length());
    }

    public closestPoint(p : Vec3) : Vec3 {
        let t : number = -(this.d + p.dot(this.n)) / this.n.dot(this.n);
        return p.add(this.n.scale(t));
    }

    public threePlaneIntersection(p2 : Plane3D, p3 : Plane3D) : Vec3 | undefined {
        let p1 : Plane3D = this;
        let x1 : Vec3 = p1.closestPoint(Vec3.zero_$LI$());
        let x2 : Vec3 = p2.closestPoint(Vec3.zero_$LI$());
        let x3 : Vec3 = p3.closestPoint(Vec3.zero_$LI$());
        let n1 : Vec3 = p1.n;
        let n2 : Vec3 = p2.n;
        let n3 : Vec3 = p3.n;
        let x : Vec3 = n2.cross(n3).scale(x1.dot(n1)).add(n3.cross(n1).scale(x2.dot(n2))).add(n1.cross(n2).scale(x3.dot(n3)));
        let n1x : number = n1.x;
        let n1y : number = n1.y;
        let n1z : number = n1.z;
        let n2x : number = n2.x;
        let n2y : number = n2.y;
        let n2z : number = n2.z;
        let n3x : number = n3.x;
        let n3y : number = n3.y;
        let n3z : number = n3.z;
        let det : number = n1x * (n2y * n3z - n3y * n2z) + n2x * (n3y * n1z - n1y * n3z) + n3x * (n1y * n2z - n2y * n1z);
        if(Math.abs(det) < 0.001) {
            return undefined;
        }
        return x.scale(1.0 / det);
    }

    public fromSpace(space : Transform3D) : Plane3D {
        let knownPoint : Vec3 = this.closestPoint(Vec3.zero_$LI$());
        let newN : Vec3 = space.vectorFromThisSpace(this.n);
        let newKnownPoint : Vec3 = space.pointFromThisSpace(knownPoint);
        return Plane3D.fromKnownPtAndNormal(newKnownPoint, newN);
    }

    public toSpace(space : Transform3D) : Plane3D {
        let knownPoint : Vec3 = this.closestPoint(Vec3.zero_$LI$());
        let newN : Vec3 = space.vectorToThisSpace(this.n);
        let newKnownPoint : Vec3 = space.pointToThisSpace(knownPoint);
        return Plane3D.fromKnownPtAndNormal(newKnownPoint, newN);
    }

    public static readonly xyPlane = Plane3D.create(Vec3.unitZ, 0.0);
}
