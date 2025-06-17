export function collapseTileset(
  numTilesPerRow: number,
  map: number[][],
): number[][] {
  let maxTileIndex = map.reduce(
    (a, row) => row.reduce((b, c) => Math.max(b, c), a),
    0,
  );
  const dirs = [
    "Left" as const,
    "Right" as const,
    "Up" as const,
    "Down" as const,
  ];
  type Dir = (typeof dirs)[number];
  let dirToOpposite = (dir: Dir): Dir => {
    switch (dir) {
      case "Left":
        return "Right";
      case "Right":
        return "Left";
      case "Up":
        return "Down";
      case "Down":
        return "Up";
    }
  };
  let dirToOffset = (dir: Dir, out: { x: number; y: number }): void => {
    switch (dir) {
      case "Left": {
        out.x = -1;
        out.y = 0;
        return;
      }
      case "Right": {
        out.x = 1;
        out.y = 0;
        return;
      }
      case "Up": {
        out.x = 0;
        out.y = -1;
        return;
      }
      case "Down": {
        out.x = 0;
        out.y = 1;
        return;
      }
      default: {
        let x: never = dir;
        throw new Error(`Unreachable: ${x}`);
      }
    }
  };
  let model = new Map<string, Map<number, number>>();
  let accumulate = (sourceTile: number, edge: Dir, targetTile: number) => {
    let k = `${sourceTile}/${edge}`;
    let v = model.get(k);
    if (v == undefined) {
      v = new Map<number, number>();
      model.set(k, v);
    }
    v.set(targetTile, (v.get(targetTile) ?? 0) + 1);
  };
  // build model
  for (let i = 0; i < map.length; ++i) {
    let row = map[i];
    let rowAbove: number[] | undefined;
    if (i > 0) {
      rowAbove = map[i - 1];
    } else {
      rowAbove = undefined;
    }
    let rowBelow: number[] | undefined;
    if (i < map.length - 1) {
      rowBelow = map[i + 1];
    } else {
      rowBelow = undefined;
    }
    for (let j = 0; j < row.length; ++j) {
      if (j > 0) {
        accumulate(row[j], "Left", row[j - 1]);
      }
      if (j < row.length - 1) {
        accumulate(row[j], "Right", row[j + 1]);
      }
      if (rowAbove != undefined) {
        if (j < rowAbove.length) {
          accumulate(row[j], "Up", rowAbove[j]);
        }
      }
      if (rowBelow != undefined) {
        if (j < rowBelow.length) {
          accumulate(row[j], "Down", rowBelow[j]);
        }
      }
    }
  }
  let result = [[0]];
  let getTotal = (sourceTile: number, edge: Dir) => {
    let k = `${sourceTile}/${edge}`;
    let v = model.get(k);
    if (v == undefined) {
      return 0;
    }
    return v.values().reduce((a, b) => a + b, 0);
  };
  let getTargetCount = (
    sourceTile: number,
    edge: Dir,
    targetTile: number,
  ): number => {
    let k = `${sourceTile}/${edge}`;
    let v = model.get(k);
    if (v == undefined) {
      return 0;
    }
    return v.get(targetTile) ?? 0;
  };
  let readResultTileAt = (xIdx: number, yIdx: number) => {
    if (yIdx < 0 || yIdx >= result.length) {
      return 0;
    }
    let row = result[yIdx];
    if (xIdx < 0 || xIdx >= row.length) {
      return 0;
    }
    return row[xIdx];
  };
  let getPossibleTile = (xIdx: number, yIdx: number) => {
    let possibleTiles = new Set<number>();
    for (let i = 1; i <= maxTileIndex; ++i) {
      if (finishedTiles.has(i)) {
        continue;
      }
      possibleTiles.add(i);
    }
    let offset = { x: 0, y: 0 };
    for (let dir of dirs) {
      dirToOffset(dir, offset);
      let tileAtDir = readResultTileAt(xIdx + offset.x, yIdx + offset.y);
      if (tileAtDir == 0) {
        continue;
      }
      let oppositeDir = dirToOpposite(dir);
      let key = `${tileAtDir}/${oppositeDir}`;
      let tiles = model.get(key);
      if (tiles == undefined) {
        return undefined;
      }
      let next = new Set<number>(tiles.keys());
      possibleTiles = possibleTiles.intersection(next);
    }
    return possibleTiles.values().next().value;
  };
  let finishedTiles = new Set<number>();
  let getProbabilitiesAt = (
    xIdx: number,
    yIdx: number,
  ): Map<number, number> => {
    let probabilities = new Map<number, number>();
    let offset = { x: 0, y: 0 };
    let first = true;
    for (let dir of dirs) {
      dirToOffset(dir, offset);
      let tileAtDir = readResultTileAt(xIdx + offset.x, yIdx + offset.y);
      if (tileAtDir == 0) {
        continue;
      }
      let oppositeDir = dirToOpposite(dir);
      let denominator = getTotal(tileAtDir, oppositeDir);
      if (denominator == 0) {
        return new Map();
      }
      let firstDir = first;
      first = false;
      for (let i = 1; i <= maxTileIndex; ++i) {
        if (finishedTiles.has(i)) {
          continue;
        }
        let numerator = getTargetCount(tileAtDir, oppositeDir, i);
        let p = numerator / denominator;
        if (firstDir) {
          probabilities.set(i, p);
        } else {
          let p2 = probabilities.get(i);
          if (p2 != undefined) {
            probabilities.set(i, p * p2);
          }
        }
      }
    }
    if (first) {
      let count = 0;
      for (let i = 1; i <= maxTileIndex; ++i) {
        if (finishedTiles.has(i)) {
          continue;
        }
        ++count;
      }
      let p = 1.0 / count;
      for (let i = 1; i <= maxTileIndex; ++i) {
        if (finishedTiles.has(i)) {
          continue;
        }
        probabilities.set(i, p);
      }
    }
    return probabilities;
  };
  let getEntropy = (probabilities: Map<number, number>) => {
    let entropy = 0.0;
    for (let i = 1; i <= maxTileIndex; ++i) {
      if (finishedTiles.has(i)) {
        continue;
      }
      let p = probabilities.get(i) ?? 0;
      if (p == 0) {
        continue;
      }
      entropy += -p * Math.log2(p);
    }
    return entropy;
  };
  let writeResultCell = (xIdx: number, yIdx: number, tile: number) => {
    while (result.length <= yIdx) {
      result.push([]);
    }
    let row = result[yIdx];
    while (row.length <= xIdx) {
      row.push(0);
    }
    row[xIdx] = tile;
  };
  while (true) {
    let minEntropy: undefined | number = undefined;
    let minEntropyAtYIdx: number | undefined = undefined;
    let minEntropyAtXIdx: number | undefined = undefined;
    for (let yIdx = 0; yIdx <= result.length + 1; ++yIdx) {
      for (let xIdx = 0; xIdx < numTilesPerRow; ++xIdx) {
        if ((result[yIdx]?.[xIdx] ?? 0) != 0) {
          continue;
        }
        let probabilities = getProbabilitiesAt(xIdx, yIdx);
        let maxProbability = probabilities
          .values()
          .reduce((a, b) => Math.max(a, b), 0);
        if (maxProbability == 0) {
          continue;
        }
        let entropy = getEntropy(probabilities);
        if (minEntropy == undefined || entropy < minEntropy) {
          minEntropy = entropy;
          minEntropyAtYIdx = yIdx;
          minEntropyAtXIdx = xIdx;
        }
      }
    }
    if (minEntropyAtXIdx == undefined || minEntropyAtYIdx == undefined) {
      break;
    }
    let xIdx = minEntropyAtXIdx;
    let yIdx = minEntropyAtYIdx;
    //
    let probabilities = getProbabilitiesAt(xIdx, yIdx);
    let maxProbability: number | undefined = undefined;
    let maxProbabilityTile: number | undefined = undefined;
    for (let i = 1; i <= maxTileIndex; ++i) {
      if (finishedTiles.has(i)) {
        continue;
      }
      let p = probabilities.get(i);
      if (p == undefined) {
        continue;
      }
      if (maxProbability == undefined || p > maxProbability) {
        maxProbability = p;
        maxProbabilityTile = i;
      }
    }
    if (maxProbabilityTile == undefined) {
      break;
    }
    writeResultCell(xIdx, yIdx, maxProbabilityTile);
    finishedTiles.add(maxProbabilityTile);
  }
  return result;
}
