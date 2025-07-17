import { v4 as uuid } from "uuid";
import { Doc, DocHandle } from "@automerge/automerge-repo";
import {
  IsEcsComponentType,
  IsEcsComponent,
  EcsComponentType,
  EcsComponent,
} from "./EcsComponent";
import { IEcsWorld } from "./IEcsWorld";
import { EcsRegistry } from "./EcsRegistry";
import { err, ok, Result } from "../kitty-demo/Result";
import { produce } from "solid-js/store";
import {
  loadFromJsonViaTypeSchema,
  saveToJsonViaTypeSchema,
  TypeSchema,
} from "../TypeSchema";
import {
  Accessor,
  batch,
  Component,
  createComputed,
  createMemo,
  createRoot,
  getListener,
  getOwner,
  mapArray,
  on,
  onCleanup,
  untrack,
} from "solid-js";
import { makeDocumentProjection } from "solid-automerge";

class ReactiveCache<A> {
  private map = new Map<
    string,
    {
      cache: Accessor<A>;
      refCount: number;
      dispose: () => void;
    }
  >();

  cached(key: string, mkValue: () => A): Accessor<A> {
    if (getOwner() == null) {
      let result = this.map.get(key);
      if (result != undefined) {
        return result.cache;
      }
      return mkValue;
    }
    let result = this.map.get(key);
    if (result == undefined) {
      let { dispose, cache } = createRoot((dispose) => {
        return {
          dispose,
          cache: createMemo(mkValue),
        };
      });
      result = {
        cache,
        refCount: 1,
        dispose,
      };
      this.map.set(key, result);
    } else {
      result.refCount++;
    }
    onCleanup(() => {
      result.refCount--;
      if (result.refCount == 0) {
        result.dispose();
        this.map.delete(key);
      }
    });
    return result.cache;
  }
}

export class EcsWorldAutomergeProjection implements IEcsWorld {
  private registry: EcsRegistry;
  private docHandle: DocHandle<any>;
  private doc: Doc<any>;
  private keepAliveMap = new Map<string, () => void>();

  constructor(registry: EcsRegistry, docHandle: DocHandle<any>, doc: Doc<any>) {
    this.registry = registry;
    this.docHandle = docHandle;
    this.doc = doc;
    onCleanup(() => {
      this.keepAliveMap.values().forEach((c) => c());
    });
  }

  static create(
    registry: EcsRegistry,
    docHandle: DocHandle<any>,
  ): Result<EcsWorldAutomergeProjection> {
    let doc = makeDocumentProjection(docHandle);
    return ok(new EcsWorldAutomergeProjection(registry, docHandle, doc));
  }

  private _entitiesCache = new ReactiveCache<string[]>();
  entities(): string[] {
    return this._entitiesCache.cached("", () => {
      return Object.keys(this.doc);
    })();
  }

  private _entitiesWithComponentTypeCache = new ReactiveCache<string[]>();
  entitiesWithComponentType(componentType: IsEcsComponentType): string[] {
    return this._entitiesWithComponentTypeCache.cached(
      componentType.typeName,
      () => {
        let result: string[] = [];
        for (let entity of this.entities()) {
          if (
            this.getComponent(entity, componentType as EcsComponentType<any>) !=
            undefined
          ) {
            result.push(entity);
          }
        }
        return result;
      },
    )();
  }

  createEntityWithId(entityId: string, components: IsEcsComponent[]): void {
    this.docHandle.change((doc) => {
      let components2: { [t: string]: any } = {};
      for (let component of components) {
        let component2 = component as EcsComponent<object>;
        let component3 = saveToJsonViaTypeSchema(
          component2.type.typeSchema,
          component2.state,
        );
        components2[component2.type.typeName] = component3;
      }
      doc[entityId] = components2;
    });
    for (let component of components) {
      let component2 = component as EcsComponent<object>;
      let componentTypeName = component2.type.typeName;
      let component3 = component2.type.createJsonProjectionV3(
        untrack(() => this.doc[entityId][componentTypeName]),
        (callback: (json: any) => void) =>
          this.docHandle.change((doc2) =>
            callback(doc2[entityId][componentTypeName]),
          ),
      );
      if (component3.type == "Err") {
        throw new Error("Unreachable");
      }
      let component4 = component3.value;
      component2.state = component4.state;
      component2.setState = component4.setState;
    }
  }

  createEntity(components: IsEcsComponent[]): string {
    let id = uuid();
    this.createEntityWithId(id, components);
    return id;
  }

  destroyEntity(entityId: string): void {
    this.docHandle.change((doc) => {
      delete doc[entityId];
    });
  }

  getComponent<A extends object>(
    entityId: string,
    componentType: EcsComponentType<A>,
  ): EcsComponent<A> | undefined {
    let components = this.doc[entityId];
    if (components == undefined) {
      return undefined;
    }
    let component = components[componentType.typeName];
    if (component == undefined) {
      return undefined;
    }
    let r = componentType.createJsonProjectionV3(component, (callback) => {
      this.docHandle.change((doc) => {
        let component = doc?.[entityId]?.[componentType.typeName];
        if (component == undefined) {
          return;
        }
        callback(component);
      });
    });
    if (r.type == "Err") {
      throw new Error("Unreachable");
    }
    return r.value;
  }

  getComponents(entityId: string): IsEcsComponent[] {
    let result: IsEcsComponent[] = [];
    let components = this.doc[entityId];
    if (components == undefined) {
      return [];
    }
    for (let componentTypeName of Object.keys(components)) {
      let componentType = this.registry.componentTypeMap.get(componentTypeName);
      if (componentType == undefined) {
        continue;
      }
      let component = this.getComponent(
        entityId,
        componentType as EcsComponentType<object>,
      );
      if (component == undefined) {
        continue;
      }
      result.push(component);
    }
    return result;
  }

  unsetComponent(entityId: string, componentType: IsEcsComponentType): void {
    this.docHandle.change((doc) => {
      let entity = doc[entityId];
      if (entity == undefined) {
        return;
      }
      delete entity[componentType.typeName];
    });
  }

  unsetComponents(
    entityId: string,
    componentTypes: IsEcsComponentType[],
  ): void {
    this.docHandle.change((doc) => {
      let entity = doc[entityId];
      if (entity == undefined) {
        return;
      }
      for (let componentType of componentTypes) {
        delete entity[componentType.typeName];
      }
    });
  }

  debugInfo(): string {
    return JSON.stringify(this.doc);
  }
}
