import { edgeCorners, edges, triangleTable } from "./tables";

export type Sdf = (x: number, y: number, z: number) => number;

export function march(params: {
  sdf: Sdf,
  minX: number,
  maxX: number,
  minY: number,
  maxY: number,
  minZ: number,
  maxZ: number,
  cubeSize: number,
  interpolate: boolean,
}): {
  /**
   * [x0, y0, z0, x1, y1, z1, x2, y2, z2, ...]
   */
  points: number[],
  /**
   * [t0v1Idx, t0v2Idx, t0v3Idx, t1v1Idx, t1v2Idx, t1v3Idx, ...]
   */
  triangles: number[],
} {
  let numCubesX = Math.ceil((params.maxX - params.minX) / params.cubeSize);
  let numCubesY = Math.ceil((params.maxY - params.minY) / params.cubeSize);
  let numCubesZ = Math.ceil((params.maxZ - params.minZ) / params.cubeSize);
  let useMinX = 0.5 * (params.minX + params.maxX - numCubesX * params.cubeSize);
  let useMinY = 0.5 * (params.minY + params.maxY - numCubesY * params.cubeSize);
  let useMinZ = 0.5 * (params.minZ + params.maxZ - numCubesZ * params.cubeSize);
  let sdf = params.sdf;
  let cornerValues: [
    number, number, number, number,
    number, number, number, number,
  ] = [
    0, 0, 0, 0,
    0, 0, 0, 0,
  ];
  let points: number[] = [];
  let triangles: number[] = [];
  let _pointToIdMap = new Map<string,number>();
  let atMinX: number = 0.0;
  let atMinY: number = 0.0;
  let atMinZ: number = 0.0;
  let allocPoint = (x: number, y: number, z: number) => {
    let x2 = atMinX + x;
    let y2 = atMinY + y;
    let z2 = atMinZ + z;
    let key = `${x2}_${y2}_${z2}`;
    let r = _pointToIdMap.get(key);
    if (r != undefined) {
      return r;
    }
    r = points.length / 3;
    points.push(x2, y2, z2);
    _pointToIdMap.set(key, r);
    return r;
  };
  atMinX = useMinX;
  for (let ix = 0; ix < numCubesX; ++ix, atMinX += params.cubeSize) {
    let atMaxX = atMinX + params.cubeSize;
    atMinY = useMinY;
    for (let iy = 0; iy < numCubesY; ++iy, atMinY += params.cubeSize) {
      let atMaxY = atMinY + params.cubeSize;
      atMinZ = useMinZ;
      for (let iz = 0; iz < numCubesZ; ++iz, atMinZ += params.cubeSize) {
        let atMaxZ = atMinZ + params.cubeSize;
        cornerValues[0] = sdf(atMinX, atMinY, atMinZ);
        cornerValues[1] = sdf(atMaxX, atMinY, atMinZ);
        cornerValues[2] = sdf(atMaxX, atMinY, atMaxZ);
        cornerValues[3] = sdf(atMinX, atMinY, atMaxZ);
        cornerValues[4] = sdf(atMinX, atMaxY, atMinZ);
        cornerValues[5] = sdf(atMaxX, atMaxY, atMinZ);
        cornerValues[6] = sdf(atMaxX, atMaxY, atMaxZ);
        cornerValues[7] = sdf(atMinX, atMaxY, atMaxZ);
        let cubeIndex = 0;
        for (let i = 0, a = 1; i < 8; ++i, a <<= 1) {
          if (cornerValues[i] < 0.0) {
            cubeIndex |= a;
          }
        }
        let cellTriangles = triangleTable[cubeIndex];
        for (let i = 0; i < cellTriangles.length - 2; i += 3) {
          let edge1 = edges[cellTriangles[i]];
          let edge2 = edges[cellTriangles[i+1]];
          let edge3 = edges[cellTriangles[i+2]];
          if (params.interpolate) {
            const edgeCorners1 = edgeCorners[cellTriangles[i]];
            const edgeCorners2 = edgeCorners[cellTriangles[i+1]];
            const edgeCorners3 = edgeCorners[cellTriangles[i+2]];
            let edgeInterpolate1 =
              Math.abs(cornerValues[edgeCorners1[0]]) /
              Math.abs(
                cornerValues[edgeCorners1[1]] - cornerValues[edgeCorners1[0]]
              );
            let edgeInterpolate2 =
              Math.abs(cornerValues[edgeCorners2[0]]) /
              Math.abs(
                cornerValues[edgeCorners2[1]] - cornerValues[edgeCorners2[0]]
              );
            let edgeInterpolate3 =
              Math.abs(cornerValues[edgeCorners3[0]]) /
              Math.abs(
                cornerValues[edgeCorners3[1]] - cornerValues[edgeCorners3[0]]
              );
            let pt1Idx = allocPoint(
              edge1[0] === 0.5 ? edgeInterpolate1 : edge1[0],
              edge1[1] === 0.5 ? edgeInterpolate1 : edge1[1],
              edge1[2] === 0.5 ? edgeInterpolate1 : edge1[2],
            );
            let pt2Idx = allocPoint(
              edge2[0] === 0.5 ? edgeInterpolate2 : edge2[0],
              edge2[1] === 0.5 ? edgeInterpolate2 : edge2[1],
              edge2[2] === 0.5 ? edgeInterpolate2 : edge2[2],
            );
            let pt3Idx = allocPoint(
              edge3[0] === 0.5 ? edgeInterpolate3 : edge3[0],
              edge3[1] === 0.5 ? edgeInterpolate3 : edge3[1],
              edge3[2] === 0.5 ? edgeInterpolate3 : edge3[2],
            );
            triangles.push(pt1Idx, pt2Idx, pt3Idx);
          } else {
            let pt1Idx = allocPoint(edge1[0], edge1[1], edge1[2]);
            let pt2Idx = allocPoint(edge2[0], edge2[1], edge2[2]);
            let pt3Idx = allocPoint(edge3[0], edge3[1], edge3[2]);
            triangles.push(pt1Idx, pt2Idx, pt3Idx);
          }
        }
      }
    }
  }
  return {
    points,
    triangles,
  };
}
