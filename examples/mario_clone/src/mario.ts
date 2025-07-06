import * as $ from "prelude";
import { batch, createComputed, createRoot } from "prelude/solid-js";

const gravity = 0.8;
const dampingFactor = 0.98;
const groundFriction = 0.9;
const MAX_VEL_X = 10;
const MAX_VEL_Y = 20;
const MARIO_START_X = 100;
const MARIO_START_Y = 1170;
const MARIO_JUMP_SOUND = 39;
const MARIO_SLIDE_SOUND = 54;

let gmeReady = false;
let gmePlaying = false;
let gme = $.createGmeSystem({
  fileUrl: "https://clinuxrulz.github.io/kitty/smb3.nsf",
  onReady: () => {
    gmeReady = true;
  },
});

document.addEventListener("click", () => {
  if (gmeReady && !gmePlaying) {
    gme.playMusic(8);
    gmePlaying = true;
  }
});

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
  duck: false,
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
    createComputed(() => {
      keyState.duck = dpad.downPressed();
    });
    return dispose;
  }));
}, 3000);

let keyDownListener = (e: KeyboardEvent) => {
  switch (e.key) {
    case "ArrowLeft": keyState.left = true; break;
    case "ArrowRight": keyState.right = true; break;
    case "ArrowDown": keyState.duck = true; break;
    case " ": keyState.jump = true; break;
  }
};

let keyUpListener = (e: KeyboardEvent) => {
  switch (e.key) {
    case "ArrowLeft": keyState.left = false; break;
    case "ArrowRight": keyState.right = false; break;
    case "ArrowDown": keyState.duck = false; break;
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
      $.Vec2.create(MARIO_START_X,MARIO_START_Y),
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
    animationName: "stand",
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

let lastSlideSoundT: number = 0;
function updateFrame(t: number) {
  cr.update();
  let animatedComponent = $.world.getComponent(m, $.animatedComponentType);
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
    if (!$.world.getComponent(m, $.flipXComponentType)) {
      $.world.setComponent(m, $.flipXComponentType.create({}));
    }
    if (velocity.x < 0) {
      if (animatedComponent != undefined && $.world.getComponent(m, $.onGroundComponentType) != undefined) {
        animatedComponent.setState("animationName", "walk");
      }
    } else {
      if (animatedComponent != undefined) {
        if (animatedComponent.state.animationName != "racoon-slide" || t - lastSlideSoundT > 100) {
          animatedComponent.setState("animationName", "racoon-slide");
          gme.playSound(MARIO_SLIDE_SOUND);
          lastSlideSoundT = t;
        }
      }
    }
  }
  if (keyState.right) {
    velocity = velocity.add($.Vec2.create(0.2, 0));
    if ($.world.getComponent(m, $.flipXComponentType) != undefined) {
      $.world.unsetComponent(m, $.flipXComponentType);
    }
    if (velocity.x > 0) {
      if (animatedComponent != undefined && $.world.getComponent(m, $.onGroundComponentType) != undefined) {
        animatedComponent.setState("animationName", "walk");
      }
    } else {
      if (animatedComponent != undefined) {
        if (animatedComponent.state.animationName != "racoon-slide" || t - lastSlideSoundT > 100) {
          animatedComponent.setState("animationName", "racoon-slide");
          gme.playSound(MARIO_SLIDE_SOUND);
          lastSlideSoundT = t;
        }
      }
    }
  }
  if (!keyState.left && !keyState.right && !keyState.duck && $.world.getComponent(m, $.onGroundComponentType) != undefined) {
    velocity = $.Vec2.create(velocity.x * groundFriction, velocity.y);
    if (velocity.x < 0.5) {
      if (animatedComponent != undefined) {
        animatedComponent.setState("animationName", "racoon-stand");
      }
    }
  }
  if (keyState.jump) {
    if ($.world.getComponent(m, $.onGroundComponentType) != undefined) {
      if (animatedComponent != undefined) {
        animatedComponent.setState("animationName", "racoon-jump");
      }
      velocity = velocity.add($.Vec2.create(0,-100));
      gme.playSound(MARIO_JUMP_SOUND);
    }
  }
  if ($.world.getComponent(m, $.onGroundComponentType) == undefined) {
    if (velocity.y > 0 && animatedComponent != undefined) {
      if (animatedComponent.state.animationName != "racoon-fall") {
          animatedComponent.setState("animationName", "racoon-fall");
      }
    }
  }
  if (keyState.duck) {
    if ($.world.getComponent(m, $.onGroundComponentType) != undefined) {
      if (animatedComponent.state.animationName != "racoon-duck") {
        animatedComponent.setState("animationName", "racoon-duck");
      }
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
      updateFrame(t);
      atT += frameDelayMs;
    }
  });
  requestAnimationFrame(animate);
};
setTimeout(() => requestAnimationFrame(animate), 5000);

