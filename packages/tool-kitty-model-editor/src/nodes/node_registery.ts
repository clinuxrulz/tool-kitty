import { NodeRegistry } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { sphereNodeType } from "./SphereNode";
import { numberNodeType } from "./NumberNode";
import { displayNodeType } from "./DisplayNode";
import { vec3NodeType } from "./Vec3Node";
import { translateNodeType } from "./TranslateNode";
import { boxNodeType } from "./BoxNode";
import { unionNodeType } from "./UnionNode";
import { differenceNodeType } from "./DifferenceNode";
import { repeatNodeType } from "./RepeatNode";
import { scaleNodeType } from "./ScaleNode";

export const nodeRegistry = new NodeRegistry<NodeTypeExt,NodeExt>();

nodeRegistry.registerNodeTypes([
  boxNodeType,
  differenceNodeType,
  displayNodeType,
  numberNodeType,
  repeatNodeType,
  scaleNodeType,
  sphereNodeType,
  translateNodeType,
  unionNodeType,
  vec3NodeType,
]);
