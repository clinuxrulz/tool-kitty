import { IsEcsComponentType } from "./EcsComponent";

export class EcsRegistry {
  componentTypes: IsEcsComponentType[];
  componentTypeMap: Map<string, IsEcsComponentType>;

  constructor(componentTypes: IsEcsComponentType[]) {
    this.componentTypes = componentTypes;
    this.componentTypeMap = new Map(componentTypes.map((x) => [x.typeName, x]));
  }
}
