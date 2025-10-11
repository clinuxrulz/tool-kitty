import { NodeRegistry } from "tool-kitty-node-editor";
import { NodeExt, NodeTypeExt } from "../NodeExt";
import { sphereNodeType } from "./SphereNode";
import { numberNodeType } from "./NumberNode";
import { displayNodeType } from "./DisplayNode";
import { vec3NodeType } from "./Vec3Node";
import { translateNodeType } from "./TranslateNode";

export const nodeRegistry = new NodeRegistry<NodeTypeExt,NodeExt>();

nodeRegistry.registerNodeTypes([
  displayNodeType,
  numberNodeType,
  sphereNodeType,
  translateNodeType,
  vec3NodeType,
]);
