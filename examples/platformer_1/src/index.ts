import * as $ from "prelude";

let dispose1 = $.useSystem("PixiRenderSystem");
let dispose2 = $.useSystem("CollisionSystem");
let dispose3 = $.useSystem("AnimationSystem");

let l1 = $.world.createEntity([
  $.levelRefComponentType.create({
    levelFilename: "l1.json",
  }),
]);

export function onUnload() {
  $.world.destroyEntity(l1);
  dispose1();
  dispose2();
  dispose3();
}
