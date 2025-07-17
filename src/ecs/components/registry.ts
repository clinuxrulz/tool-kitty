import { EcsRegistry } from "../EcsRegistry";
import { childrenComponentType } from "./ChildrenComponent";
import { parentComponentType } from "./ParentComponent";
import { sortOrderIndexComponentType } from "./SortOrderIndexComponent";

export const registry = new EcsRegistry([
  childrenComponentType,
  parentComponentType,
  sortOrderIndexComponentType,
]);
