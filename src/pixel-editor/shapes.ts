export function drawLine(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  drawPixel: (x: number, y: number) => void,
) {
  let dx = x2 - x1;
  let dy = y2 - y1;
  let adx = Math.abs(dx);
  let ady = Math.abs(dy);
  let xDir = Math.sign(dx);
  let yDir = Math.sign(dy);
  // Overshoot by 1, but don't include last points.
  // This will make all the tail sizes throughout the line the same size.
  x2 += xDir;
  y2 += yDir;
  ++adx;
  ++ady;
  //
  if (adx > ady) {
    let dn = ady % adx;
    let n = 0;
    let d = adx;
    let y = y1;
    let x = x1;
    for (; x != x2; x += xDir) {
      drawPixel(x, y);
      n += dn;
      if (n >= d) {
        y += yDir;
        n -= d;
      }
    }
  } else if (adx < ady) {
    let dn = adx % ady;
    let n = 0;
    let d = ady;
    let x = x1;
    let y = y1;
    for (; y != y2; y += yDir) {
      drawPixel(x, y);
      n += dn;
      if (n >= d) {
        x += xDir;
        n -= d;
      }
    }
  } else {
    for (let x = x1, y = y1; x != x2; x += xDir, y += yDir) {
      drawPixel(x, y);
    }
  }
}

export function drawRect(
  minX: number,
  minY: number,
  width: number,
  height: number,
  drawPixel: (x: number, y: number) => void,
): void {
  let maxY = minY + height;
  let maxX = minX + width;
  for (let x = minX; x <= minX + width; ++x) {
    drawPixel(x, minY);
    drawPixel(x, maxY);
  }
  for (let y = minY + 1; y <= minY + height - 1; ++y) {
    drawPixel(minX, y);
    drawPixel(maxX, y);
  }
}

export function drawEllipse(
  minX: number,
  minY: number,
  width: number,
  height: number,
  drawPixel: (x: number, y: number) => void,
): void {
  if (width == 0) {
    for (let y = minY; y <= minY + height; ++y) {
      drawPixel(minX, y);
    }
    return;
  }
  if (height == 0) {
    for (let x = minX; x <= minX + width; ++x) {
      drawPixel(x, minY);
    }
    return;
  }
  let centreX1 = minX + (width >> 1);
  let centreX2 = minX + width - (width >> 1);
  let centreY1 = minY + (height >> 1);
  let centreY2 = minY + height - (height >> 1);
  let radiusX = 0.5 * width;
  let radiusY = 0.5 * height;
  //
  let x = 0;
  let y = Math.ceil(radiusY);
  let a = radiusY;
  let b = radiusX;
  let errL1 = a * a * x * x + b * b * y * y - a * a * b * b;
  /*
   * errL2x(x,y) = 2a²x + a²
   * errL1(x+1,y) = errL1(x,y) + errL2x(x,y)
   * errL2x(x+1,y) = errL2x(x,y) + 2a²
   */
  let errL2x = 2 * a * a * x + a * a;
  /*
   * errL2y(x,y) = -2b²y + b²
   * errL1(x,y-1) = errL1(x,y) + errL2y(x,y)
   * errL2y(x,y-1) = errL2y(x,y) + 2b²
   */
  let errL2y = -2 * b * b * y + b * b;
  let twoA2 = 2 * a * a;
  let twoB2 = 2 * b * b;
  let lastX: number | undefined = undefined;
  let lastY: number | undefined = undefined;
  let draw4 = () => {
    if (x == lastX && y == lastY) {
      return;
    }
    lastX = x;
    lastY = y;
    drawPixel(centreX1 + x, centreY1 + y);
    drawPixel(centreX2 - x, centreY1 + y);
    drawPixel(centreX1 + x, centreY2 - y);
    drawPixel(centreX2 - x, centreY2 - y);
  };
  while (x <= radiusX) {
    draw4();
    ++x;
    errL1 += errL2x;
    errL2x += twoA2;
    let oldY = y;
    while (errL1 > 0) {
      --y;
      errL1 += errL2y;
      errL2y += twoB2;
      if (y < 0) {
        for (y = oldY - 1; y >= 0; --y) {
          draw4();
        }
        return;
      }
    }
    while (errL1 < 0) {
      ++y;
      errL2y -= twoB2;
      errL1 -= errL2y;
    }
    let newY = y;
    for (y = oldY - 1; y > newY; --y) {
      draw4();
    }
    y = newY;
  }
}

export function drawFilledCircle(
  x: number,
  y: number,
  r: number,
  drawPixel: (x: number, y: number) => void,
) {
  let r2 = r * r;
  for (let i = -(r - 1); i <= r - 1; ++i) {
    let i2 = i * i;
    for (let j = -(r - 1); j <= r - 1; ++j) {
      let j2 = j * j;
      if (i2 + j2 < r2) {
        drawPixel(x + i, y + j);
      }
    }
  }
}

export function drawWave(
  sx: number,
  sy: number,
  a: number,
  b: number,
  drawPixel: (x: number, y: number) => void,
) {
  a *= 2;
  b *= 2;
  let dummy1 = 120 * a * b * b * b * b;
  let dummy2 = 0;
  let dummy3 = -20 * a * b * b;
  let dummy4 = 0;
  let dummy5 = 0;
  let dummy6 = 0;
  let dummy7 = a;
  let dummy8 = 0;
  let dummy9 = 0;
  let dummy10 = 0;
  let dummy11 = 0;
  let dummy12 = 0;
  let dummy13 = -120 * b * b * b * b * b;
  let dummy14 = 0;
  let err = 0;
  let x = 0;
  let y = 0;
  let mx = Math.floor(a * 0.5 * Math.PI) * 2.5;
  while (x <= mx) {
    drawPixel(sx + x, sy - y);
    drawPixel(sx + 2 * mx - x, sy - y);
    drawPixel(sx + 2 * mx + x, sy + y);
    drawPixel(sx + 4 * mx - x, sy + y);
    ++x;
    //
    dummy12 += dummy11;
    dummy11 += dummy10;
    dummy10 += dummy9;
    dummy9 += dummy8;
    dummy8 += dummy7;
    //
    dummy6 += dummy5;
    dummy5 += dummy4;
    dummy4 += dummy3;
    //
    dummy2 += dummy1;
    //
    err = dummy2 + dummy6 + dummy12 + dummy14;
    while (err < 0) {
      --y;
      err -= dummy13;
      dummy14 -= dummy13;
    }
    while (err > 0) {
      ++y;
      dummy14 += dummy13;
      err += dummy13;
    }
  }
}

export function floodFill(
  x: number,
  y: number,
  isSourceColour: (x: number, y: number) => boolean,
  drawPixel: (x: number, y: number) => void,
) {
  let toVisitStack: number[] = [];
  toVisitStack.push(y);
  toVisitStack.push(x);
  while (toVisitStack.length >= 2) {
    let atX = toVisitStack.pop()!;
    let atY = toVisitStack.pop()!;
    if (!isSourceColour(atX, atY)) {
      continue;
    }
    for (let atX2 = atX; isSourceColour(atX2, atY); ++atX2) {
      drawPixel(atX2, atY);
      if (isSourceColour(atX2, atY - 1)) {
        toVisitStack.push(atY - 1);
        toVisitStack.push(atX2);
      }
      if (isSourceColour(atX2, atY + 1)) {
        toVisitStack.push(atY + 1);
        toVisitStack.push(atX2);
      }
    }
    for (let atX2 = atX - 1; isSourceColour(atX2, atY); --atX2) {
      drawPixel(atX2, atY);
      if (isSourceColour(atX2, atY - 1)) {
        toVisitStack.push(atY - 1);
        toVisitStack.push(atX2);
      }
      if (isSourceColour(atX2, atY + 1)) {
        toVisitStack.push(atY + 1);
        toVisitStack.push(atX2);
      }
    }
  }
}
