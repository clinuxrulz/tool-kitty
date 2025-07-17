/**
 * Attempt at zero memory collision detection
 */
export const collision_detection = (() => {
  const INIT_BUFFER_SIZE = 100;
  let bufferX_: any[] = new Array(INIT_BUFFER_SIZE);
  return <A>(params: {
    hasBox: {
      x: (a: A) => number;
      y: (a: A) => number;
      w: (a: A) => number;
      h: (a: A) => number;
    };
    objects: A[];
    onCollide: (a: A, b: A) => void;
  }) => {
    let bufferX = bufferX_ as A[];
    bufferX.length = 0;
    for (let object of params.objects) {
      bufferX.push(object);
    }
    bufferX.sort((a, b) => params.hasBox.x(a) - params.hasBox.x(b));
    for (let i = 0; i < bufferX.length - 1; ++i) {
      let objectI = bufferX[i];
      let objectIMaxX = params.hasBox.x(objectI) + params.hasBox.w(objectI);
      let objectIMaxY = params.hasBox.y(objectI) + params.hasBox.h(objectI);
      for (let j = i + 1; j < bufferX.length; ++j) {
        let objectJ = bufferX[j];
        if (
          params.hasBox.x(objectJ) < objectIMaxX &&
          params.hasBox.y(objectJ) + params.hasBox.h(objectJ) >
            params.hasBox.y(objectI) &&
          params.hasBox.y(objectJ) < objectIMaxY
        ) {
          params.onCollide(objectI, objectJ);
        } else {
          break;
        }
      }
    }
    bufferX.length = 0;
  };
})();
