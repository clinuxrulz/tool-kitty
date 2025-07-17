import { v4 as uuid } from "uuid";
import { ReactiveMap } from "@solid-primitives/map";
import {
  EcsComponent,
  EcsComponentType,
  IsEcsComponent,
  IsEcsComponentType,
} from "./EcsComponent";
import { batch, untrack } from "solid-js";
import { ReactiveSet } from "@solid-primitives/set";
import { makeRefCountedMakeReactiveObject } from "../util";
import { err, ok, Result } from "../kitty-demo/Result";
import { EcsRegistry } from "./EcsRegistry";
import {
  loadFromJsonViaTypeSchema,
  saveToJsonViaTypeSchema,
} from "../TypeSchema";
import { IEcsWorld } from "./IEcsWorld";
import { childrenComponentType } from "./components/ChildrenComponent";
import { produce } from "solid-js/store";
import { parentComponentType } from "./components/ParentComponent";

export class EcsWorld implements IEcsWorld {
  private entityMap: ReactiveMap<string, ReactiveMap<string, IsEcsComponent>>;
  private componentTypeEntitiesMap: ReactiveMap<string, ReactiveSet<string>>;
  private componentTypeEntitiesMap_: Map<string, () => string[]> = new Map();

  constructor() {
    this.entityMap = new ReactiveMap();
    this.componentTypeEntitiesMap = new ReactiveMap();
  }

  entities(): string[] {
    return Array.from(this.entityMap.keys());
  }

  entitiesWithComponentType(componentType: IsEcsComponentType): string[] {
    {
      let r = this.componentTypeEntitiesMap_.get(componentType.typeName);
      if (r != undefined) {
        return r();
      }
    }
    let r = makeRefCountedMakeReactiveObject(
      () => {
        let result = this.componentTypeEntitiesMap.get(componentType.typeName);
        if (result == undefined) {
          return [];
        }
        let result2: string[] = [];
        for (let x of result) {
          result2.push(x);
        }
        return result2;
      },
      () => {
        this.componentTypeEntitiesMap_.delete(componentType.typeName);
      },
    );
    this.componentTypeEntitiesMap_.set(componentType.typeName, r);
    return r();
  }

  createEntityWithId(entityId: string, components: IsEcsComponent[]) {
    untrack(() =>
      batch(() => {
        this.entityMap.set(
          entityId,
          new ReactiveMap<string, IsEcsComponent>(
            components.map((component) => [component.type.typeName, component]),
          ),
        );
        for (let component of components) {
          let entitySet = this.componentTypeEntitiesMap.get(
            component.type.typeName,
          );
          if (entitySet == undefined) {
            entitySet = new ReactiveSet();
            this.componentTypeEntitiesMap.set(
              component.type.typeName,
              entitySet,
            );
          }
          entitySet.add(entityId);
        }
      }),
    );
  }

  createEntity(components: IsEcsComponent[]): string {
    let id = uuid();
    this.createEntityWithId(id, components);
    return id;
  }

  destroyEntity(entityId: string) {
    untrack(() =>
      batch(() => {
        let components = this.entityMap.get(entityId);
        if (components != undefined) {
          for (let component of components.values()) {
            let entitySet = this.componentTypeEntitiesMap.get(
              component.type.typeName,
            );
            if (entitySet != undefined) {
              entitySet.delete(entityId);
            }
          }
        }
        this.entityMap.delete(entityId);
      }),
    );
  }

  attachToParent(entityId: string, parentId: string) {
    untrack(() => {
      {
        let lastParentId = this.getComponent(entityId, parentComponentType)
          ?.state?.parentId;
        if (lastParentId != undefined) {
          this.detactFromParent(entityId);
        }
      }
      let childrenComponent = this.getComponent(
        parentId,
        childrenComponentType,
      );
      if (childrenComponent == undefined) {
        childrenComponent = childrenComponentType.create({
          childIds: [entityId],
        });
        this.setComponent(parentId, childrenComponent);
      } else {
        childrenComponent.setState(
          "childIds",
          produce((childIds) => childIds.push(entityId)),
        );
      }
      this.setComponent(
        entityId,
        parentComponentType.create({
          parentId,
        }),
      );
    });
  }

  detactFromParent(entityId: string) {
    untrack(() => {
      let parentComponent = this.getComponent(entityId, parentComponentType);
      if (parentComponent != undefined) {
        this.unsetComponent(entityId, parentComponentType);
        let parentId = parentComponent.state.parentId;
        let childrenComponent = this.getComponent(
          parentId,
          childrenComponentType,
        );
        if (childrenComponent != undefined) {
          let newChildIds = childrenComponent.state.childIds.filter(
            (id) => id !== entityId,
          );
          if (newChildIds.length == 0) {
            this.unsetComponent(parentId, childrenComponentType);
          } else {
            childrenComponent.setState("childIds", newChildIds);
          }
        }
      }
    });
  }

  getComponent<A extends object>(
    entityId: string,
    componentType: EcsComponentType<A>,
  ): EcsComponent<A> | undefined {
    let components = this.entityMap.get(entityId);
    if (components == undefined) {
      return undefined;
    }
    return components.get(componentType.typeName) as
      | EcsComponent<A>
      | undefined;
  }

  getComponents(entityId: string): IsEcsComponent[] {
    return Array.from(this.entityMap.get(entityId)?.values() ?? []);
  }

  setComponent(entityId: string, component: IsEcsComponent) {
    this.setComponents(entityId, [component]);
  }

  setComponents(entityId: string, components: IsEcsComponent[]) {
    let componentsMap = this.entityMap.get(entityId);
    if (componentsMap == undefined) {
      return;
    }
    for (let component of components) {
      componentsMap.set(component.type.typeName, component);
    }
  }

  unsetComponent(entityId: string, componentType: IsEcsComponentType) {
    let componentsMap = this.entityMap.get(entityId);
    if (componentsMap == undefined) {
      return;
    }
    componentsMap.delete(componentType.typeName);
  }

  unsetComponents(entityId: string, componentTypes: IsEcsComponentType[]) {
    let componentsMap = this.entityMap.get(entityId);
    if (componentsMap == undefined) {
      return;
    }
    for (let componentType of componentTypes) {
      componentsMap.delete(componentType.typeName);
    }
  }

  toJson(): any {
    let result: any = {};
    for (let entity of this.entities()) {
      let componentsSet: any = {};
      for (let component of this.getComponents(entity)) {
        componentsSet[component.type.typeName] = saveToJsonViaTypeSchema(
          (component.type as EcsComponentType<any>).typeSchema,
          (component as EcsComponent<any>).state,
        );
      }
      result[entity] = componentsSet;
    }
    return result;
  }

  static fromJson(registry: EcsRegistry, x: any): Result<EcsWorld> {
    let world = new EcsWorld();
    for (let entity of Object.keys(x)) {
      let components = x[entity];
      let componentTypes = Object.keys(components);
      let components2: IsEcsComponent[] = [];
      for (let componentType of componentTypes) {
        let componentType2 = registry.componentTypeMap.get(componentType);
        if (componentType2 == undefined) {
          return err(`${componentType} not found`);
        }
        let component = loadFromJsonViaTypeSchema(
          (componentType2 as any).typeSchema,
          components[componentType],
        );
        if (component.type == "Err") {
          return component;
        }
        let component2 = component.value as any;
        let component3 = (componentType2 as EcsComponentType<object>).create(
          component2,
        );
        components2.push(component3);
      }
      world.createEntityWithId(entity, components2);
    }
    return ok(world);
  }
}
