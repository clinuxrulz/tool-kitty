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
import { rotateNodeType } from "./RotateNode";
import { infiniteCylinderNodeType } from "./InfiniteCylinderNode";
import { colourNodeType } from "./ColourNode";
import { applyColourNodeType } from "./ApplyColourNode";
import { applyCheckersNodeType } from "./ApplyCheckersNode";
import { unboundKnobNodeType } from "./UnboundKnobNode";
import { cylinderNodeType } from "./CylinderNode";
import { sinXYZFieldNodeType } from "./SinXYZFieldNode";
import { displaceNodeType } from "./DisplaceNode";
import { repeatRotationalNodeType } from "./RepeatRotationalNode";
import { bendNodeType } from "./BendNode";
import { textureNodeType } from "./TextureNode";
import { applyTextureNodeType } from "./ApplyTextureNode";
import { coneNodeType } from "./ConeNode";
import { torusNodeType } from "./TorusNode";
import { mirrorNodeType } from "./MirrorNode";

export const nodeRegistry = new NodeRegistry<NodeTypeExt,NodeExt>();

nodeRegistry.registerNodeTypes([
  applyCheckersNodeType,
  applyColourNodeType,
  applyTextureNodeType,
  bendNodeType,
  boxNodeType,
  colourNodeType,
  coneNodeType,
  cylinderNodeType,
  differenceNodeType,
  displaceNodeType,
  displayNodeType,
  infiniteCylinderNodeType,
  mirrorNodeType,
  unboundKnobNodeType,
  numberNodeType,
  repeatNodeType,
  repeatRotationalNodeType,
  rotateNodeType,
  scaleNodeType,
  sinXYZFieldNodeType,
  sphereNodeType,
  textureNodeType,
  torusNodeType,
  translateNodeType,
  unionNodeType,
  vec3NodeType,
]);
