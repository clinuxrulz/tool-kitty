import * as $ from "prelude";
import { batch, createComputed, createRoot } from "prelude/solid-js";

const gravity = 0.8;
const dampingFactor = 0.98;
const MAX_VEL_X = 10;
const MAX_VEL_Y = 20;

const marioWidth = 14*3;
const marioHeight = 26*3;
const tileWidth = 16*3;
const tileHeight = 16*3;

let cr = createRoot((dispose) => {
  return new $.CollisionResolutionSystem({
    world: $.world,
    isSolidBlock: (meta) => {
      if (meta == "\"g\"") {
        return true;
      }
      return false;
    },
    isPlatform: (meta) => {
      if (meta == "\"p\"") {
        return true;
      }
      return false;
    },
    maxSpeed: $.Vec2.create(MAX_VEL_X, MAX_VEL_Y),
  });
});

document.body.style.setProperty("margin", "0");

let keyState = {
  left: false,
  right: false,
  jump: false,
};

let cleanups: (() => void)[] = [];
setTimeout(() => {
  let dpad = $.createVirtualDPadSystem();
  cleanups.push(dpad.dispose.bind(dpad));
  cleanups.push(createRoot((dispose) => {
    createComputed(() => {
      keyState.left = dpad.leftPressed();
    });
    createComputed(() => {
      keyState.right = dpad.rightPressed();
    });
    createComputed(() => {
      keyState.jump = dpad.upPressed();
    });
    return dispose;
  }));
}, 3000);

let keyDownListener = (e: KeyboardEvent) => {
  switch (e.key) {
    case "ArrowLeft": keyState.left = true; break;
    case "ArrowRight": keyState.right = true; break;
    case " ": keyState.jump = true; break;
  }
};

let keyUpListener = (e: KeyboardEvent) => {
  switch (e.key) {
    case "ArrowLeft": keyState.left = false; break;
    case "ArrowRight": keyState.right = false; break;
    case " ": keyState.jump = false; break;
  }
};

document.addEventListener("keydown", keyDownListener);
document.addEventListener("keyup", keyUpListener);

let m = $.world.createEntity([
  $.spriteComponentType.create({
    textureAtlasFilename: "ss.json",
    frameName: "mario1",
  }),
  $.transform2DComponentType.create({
    transform: $.Transform2D.create(
      $.Vec2.create(0,0),
      $.Complex.rot0,
    ),
  }),
  $.scaleComponentType.create({
    scale: 3.0,
  }),
  $.velocity2DComponentType.create({
    velocity: $.Vec2.zero,
  }),
  $.animatedComponentType.create({
    textureAtlasFilename: "ss.json",
    animationName: "walk",
    frameIndex: 0,
  }),
]);

let c = $.world.createEntity([
  $.cameraComponentType.create({
    targetEntity: m,
  }),
  $.transform2DComponentType.create({
    transform: $.Transform2D.identity,
  }),
]);

let scopeDone = false;
export function onUnload() {
  cleanups.forEach((c) => c());
  scopeDone = true;
  $.world.destroyEntity(m);
  $.world.destroyEntity(c);
  document.removeEventListener("keydown", keyDownListener);
  document.removeEventListener("keyup", keyUpListener);
}

function updateFrame() {
  cr.update();
  let velocityComponent = $.world.getComponent(m, $.velocity2DComponentType)!;
  let transformComponent = $.world.getComponent(m, $.transform2DComponentType)!;
  let velocity: $.Vec2 = velocityComponent.state.velocity;
  let pos: $.Vec2 = transformComponent.state.transform.origin;
  let originalPos = pos;
  velocity = velocity.multScalar(dampingFactor);
  velocity = velocity.add($.Vec2.create(0, gravity));
  //
  if (keyState.left) {
    velocity = velocity.add($.Vec2.create(-0.2, 0));
  }
  if (keyState.right) {
    velocity = velocity.add($.Vec2.create(0.2, 0));
  }
  if (keyState.jump) {
    if ($.world.getComponent(m, $.onGroundComponentType) != undefined) {
      velocity = velocity.add($.Vec2.create(0,-100));
    }
  }
  //
  if (Math.abs(velocity.x) > MAX_VEL_X) {
    velocity = $.Vec2.create(MAX_VEL_X * Math.sign(velocity.x), velocity.y);
  }
  if (Math.abs(velocity.y) > MAX_VEL_Y) {
    velocity = $.Vec2.create(velocity.x, MAX_VEL_Y * Math.sign(velocity.y));
  }
  velocityComponent.setState("velocity", velocity);
  //
  pos = pos.add(velocity);
  //
  transformComponent.setState(
    "transform",
    (t: $.Transform2D) =>
      $.Transform2D.create(
        pos,
        t.orientation,
      ),
  );
}

const fps = 60;
const frameDelayMs = 1000 / fps;
let atT = -1;
let animate = (t: number) => {
  if (atT == -1) {
    atT = t - frameDelayMs;
  }
  if (scopeDone) {
    return;
  }
  batch(() => {
    while (atT < t) {
      updateFrame();
      atT += frameDelayMs;
    }
  });
  requestAnimationFrame(animate);
};
setTimeout(() => requestAnimationFrame(animate), 5000);
