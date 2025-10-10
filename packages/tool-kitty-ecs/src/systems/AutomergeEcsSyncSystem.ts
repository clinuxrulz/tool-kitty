import { DocHandle, DocHandleChangePayload } from "@automerge/automerge-repo";
import { EcsWorld } from "../EcsWorld";
import { EcsRegistry } from "../EcsRegistry";
import { err, ok, Result } from "control-flow-as-value";
import { Patch } from "@automerge/automerge";
import {
  EcsComponent,
  EcsComponentType,
  IsEcsComponent,
} from "../EcsComponent";
import {
  loadFromJsonViaTypeSchema,
  saveToJsonViaTypeSchema,
  TypeSchema,
} from "tool-kitty-type-schema";
import {
  batch,
  createComputed,
  createMemo,
  createRoot,
  mapArray,
  on,
  onCleanup,
  untrack,
} from "solid-js";
import { produce } from "solid-js/store";

export function createAutomergeEcsSyncSystem(params: {
  registry: EcsRegistry;
  world: EcsWorld;
  docHandle: DocHandle<any>;
}): Result<{
  dispose: () => void;
}> {
  let transactionIsAutomerge = false;
  let world = EcsWorld.fromJson(params.registry, params.docHandle.doc());
  if (world.type == "Err") {
    return world;
  }
  let world2 = world.value;
  for (let entity of untrack(() => world2.entities())) {
    let components = untrack(() => world2.getComponents(entity));
    params.world.createEntityWithId(entity, components);
  }
  let onPatch = (payload: DocHandleChangePayload<any>) => {
    transactionIsAutomerge = true;
    try {
      doPatchWorld(params.docHandle, params.registry, world2, payload);
    } finally {
      transactionIsAutomerge = false;
    }
  };
  let onDelete = () => {
    transactionIsAutomerge = true;
    try {
      doDeleteWorld(world2);
    } finally {
      transactionIsAutomerge = false;
    }
  };
  params.docHandle.on("change", onPatch);
  params.docHandle.on("delete", onDelete);
  let dispose2 = createRoot((dispose) => {
    syncWorldToAutomergeDoc(
      params.world,
      params.docHandle,
      () => transactionIsAutomerge,
    );
    return dispose;
  });
  let dispose = () => {
    params.docHandle.off("change", onPatch);
    params.docHandle.off("delete", onDelete);
    dispose2();
  };
  return ok({
    dispose,
  });
}

function doPatchWorld(
  docHandle: DocHandle<any>,
  registry: EcsRegistry,
  world: EcsWorld,
  payload: DocHandleChangePayload<any>,
) {
  let goDeeper = (patch: Patch) => {
    // could be deleting a entity or a component, go deeper
    let entityId = patch.path[0];
    if (typeof entityId != "string") {
      throw new Error("Expected string for entity id");
    }
    doPatchEntity(docHandle, registry, world, entityId, patch);
  };
  batch(() => {
    for (let patch of payload.patches) {
      switch (patch.action) {
        case "conflict":
        case "inc":
        case "mark":
        case "unmark":
          throw new Error(`Unsupported automerge patch: ${patch.action}`);
        case "del": {
          if (patch.path.length == 0) {
            // deleting the world
            doDeleteWorld(world);
          } else {
            // could be deleting a entity or a component, go deeper
            goDeeper(patch);
          }
          break;
        }
        case "insert": {
          if (patch.path.length == 0) {
            // insert a whole new world
            if (patch.values.length != 1) {
              throw new Error(
                "Expected just one world when inserting a whole new world",
              );
            }
            let value = patch.values[0];
            let world2 = EcsWorld.fromJson(registry, value);
            if (world2.type == "Err") {
              throw new Error(world2.message);
            }
            let world3 = world2.value;
            for (let entity of world3.entities()) {
              let components = world3.getComponents(entity);
              world.createEntityWithId(entity, components);
            }
          } else {
            // go deeper
            goDeeper(patch);
          }
          break;
        }
        case "splice": {
          if (patch.path.length == 0) {
            throw new Error("splice does not make sense at top world level");
          } else {
            // go deeper
            goDeeper(patch);
          }
          break;
        }
        case "put": {
          if (patch.path.length == 0) {
            let value = patch.value;
            let world2 = EcsWorld.fromJson(registry, value);
            if (world2.type == "Err") {
              throw new Error(world2.message);
            }
            let world3 = world2.value;
            for (let entity of world3.entities()) {
              let components = world3.getComponents(entity);
              world.createEntityWithId(entity, components);
            }
          } else {
            // go deeper
            goDeeper(patch);
          }
          break;
        }
      }
    }
  });
}

function doDeleteWorld(world: EcsWorld) {
  batch(() => {
    let entities = world.entities();
    for (let entity of entities) {
      world.destroyEntity(entity);
    }
  });
}

function doPatchEntity(
  docHandle: DocHandle<any>,
  registry: EcsRegistry,
  world: EcsWorld,
  entityId: string,
  patch: Patch,
) {
  if (patch.path.length < 1) {
    throw new Error("unreachable");
  }
  let goDeeper = () => {
    let componentTypeName = patch.path[1];
    if (typeof componentTypeName != "string") {
      throw new Error("expected a string for a component type name");
    }
    doPatchComponent(
      docHandle,
      registry,
      world,
      entityId,
      componentTypeName,
      patch,
    );
  };
  switch (patch.action) {
    case "conflict":
    case "inc":
    case "mark":
    case "unmark":
      throw new Error("unreachable");
    case "del": {
      if (patch.path.length == 1) {
        // deleting this entity
        world.destroyEntity(entityId);
      } else {
        // go deeper
        goDeeper();
      }
      break;
    }
    case "insert": {
      if (patch.path.length == 1) {
        // inserting this entity
        let components: IsEcsComponent[] = [];
        if (patch.values.length != 1) {
          throw new Error("Only one component set per entity");
        }
        let obj = patch.values[0];
        if (typeof obj != "object") {
          throw new Error("Expected object");
        }
        let obj2 = obj as object;
        for (let componentTypeName of Object.keys(obj2)) {
          let componentType = registry.componentTypeMap.get(componentTypeName);
          if (componentType == undefined) {
            throw new Error(`component type ${componentTypeName} not found`);
          }
          let componentType2 = componentType as EcsComponentType<object>;
          let val = (obj2 as any)[componentTypeName];
          let component = loadFromJsonViaTypeSchema<object>(
            componentType2.typeSchema,
            val,
          );
          if (component.type == "Err") {
            throw new Error(component.message);
          }
          let component2 = component.value;
          let component3 = componentType2.create(component2);
          components.push(component3);
        }
        world.createEntityWithId(entityId, components);
      } else {
        // go deeper
        goDeeper();
      }
      break;
    }
    case "splice": {
      if (patch.path.length == 1) {
        throw new Error("splice does not make sense at entity level");
      } else {
        // go deeper
        goDeeper();
      }
      break;
    }
    case "put": {
      if (patch.path.length == 1) {
        let components: IsEcsComponent[] = [];
        let obj = patch.value;
        if (typeof obj != "object") {
          throw new Error("Expected object");
        }
        let obj2 = obj as object;
        for (let componentTypeName of Object.keys(obj2)) {
          let componentType = registry.componentTypeMap.get(componentTypeName);
          if (componentType == undefined) {
            throw new Error(`component type ${componentTypeName} not found`);
          }
          let componentType2 = componentType as EcsComponentType<object>;
          let val = (obj2 as any)[componentTypeName];
          let component = loadFromJsonViaTypeSchema<object>(
            componentType2.typeSchema,
            val,
          );
          if (component.type == "Err") {
            throw new Error(component.message);
          }
          let component2 = component.value;
          let component3 = componentType2.create(component2);
          components.push(component3);
        }
        world.createEntityWithId(entityId, components);
      } else {
        // go deeper
        goDeeper();
      }
      break;
    }
  }
}

function doPatchComponent(
  docHandle: DocHandle<any>,
  registry: EcsRegistry,
  world: EcsWorld,
  entityId: string,
  componentTypeName: string,
  patch: Patch,
) {
  if (patch.path.length < 2) {
    throw new Error("unreachable");
  }
  let goDeeper = () => {
    let fieldName = patch.path[3];
    if (typeof fieldName != "string") {
      throw new Error("Expected a string for a field name");
    }
    let componentType = registry.componentTypeMap.get(componentTypeName);
    if (componentType == undefined) {
      throw new Error(`component type ${componentTypeName} not found`);
    }
    let componentType2 = componentType as EcsComponentType<object>;
    let component = world.getComponent(entityId, componentType2);
    if (component == undefined) {
      throw new Error(`component of type ${componentTypeName} not found`);
    }
    doPatchProperty(
      docHandle,
      registry,
      world,
      entityId,
      componentTypeName,
      componentType2.typeSchema,
      component,
      fieldName,
      patch,
    );
  };
  switch (patch.action) {
    case "conflict":
    case "inc":
    case "mark":
    case "unmark":
      throw new Error("unreachable");
    case "del": {
      if (patch.path.length == 2) {
        // delete this component
        let componentType = registry.componentTypeMap.get(componentTypeName);
        if (componentType == undefined) {
          throw new Error(`component type ${componentTypeName} not found`);
        }
        world.unsetComponent(entityId, componentType);
      } else {
        // go deeper
        goDeeper();
      }
      break;
    }
    case "insert": {
      if (patch.path.length == 2) {
        // insert this component
        if (patch.values.length != 1) {
          throw new Error("can only be one component of a given type");
        }
        let obj = patch.values[0] as object;
        if (typeof obj != "object") {
          return;
        }
        let componentType = registry.componentTypeMap.get(componentTypeName);
        if (componentType == undefined) {
          throw new Error(`component type ${componentTypeName} not found`);
        }
        let componentType2 = componentType as EcsComponentType<object>;
        let component = loadFromJsonViaTypeSchema<object>(
          componentType2.typeSchema,
          obj,
        );
        if (component.type == "Err") {
          throw new Error(component.message);
        }
        let component2 = component.value;
        let component3 = componentType2.create(component2);
        world.setComponent(entityId, component3);
      } else {
        // go deeper
        goDeeper();
      }
      // TODO
      break;
    }
    case "splice": {
      if (patch.path.length == 2) {
        throw new Error("splice does not make sense here");
      } else {
        // go deeper
        goDeeper();
      }
      break;
    }
    case "put": {
      if (patch.path.length == 2) {
        // insert this component
        let obj = patch.value;
        if (typeof obj != "object") {
          return;
        }
        let componentType = registry.componentTypeMap.get(componentTypeName);
        if (componentType == undefined) {
          throw new Error(`component type ${componentTypeName} not found`);
        }
        let componentType2 = componentType as EcsComponentType<object>;
        let component = loadFromJsonViaTypeSchema<object>(
          componentType2.typeSchema,
          obj,
        );
        if (component.type == "Err") {
          throw new Error(component.message);
        }
        let component2 = component.value;
        let component3 = componentType2.create(component2);
        world.setComponent(entityId, component3);
      } else {
        goDeeper();
      }
      break;
    }
  }
}

function doPatchProperty(
  docHandle: DocHandle<any>,
  registry: EcsRegistry,
  world: EcsWorld,
  entityId: string,
  componentTypeName: string,
  typeSchema: TypeSchema<object>,
  component: EcsComponent<object>,
  fieldName: string,
  patch: Patch,
) {
  if (patch.path.length < 3) {
    throw new Error("unreachable");
  }
  if (typeSchema.type != "Object") {
    throw new Error(
      "all components are meant to have an object based TypeSchema",
    );
  }
  // shortcut (getting lazy)
  let componentData = loadFromJsonViaTypeSchema<object>(
    typeSchema,
    (docHandle as any)[entityId][componentTypeName],
  );
  if (componentData.type == "Err") {
    throw new Error(componentData.message);
  }
  let componentData2 = componentData.value;
  component.setState(
    produce((x) => {
      for (let key of Object.keys(componentData2)) {
        (x as any)[key] = (componentData2 as any)[key];
      }
    }),
  );
}

function syncWorldToAutomergeDoc(
  world: EcsWorld,
  docHandle: DocHandle<any>,
  isTransactionAutomerge: () => boolean,
) {
  createComputed(
    mapArray(
      () => world.entities(),
      (entity) => {
        if (!isTransactionAutomerge()) {
          docHandle.change((doc) => {
            doc[entity] = {};
          });
        }
        onCleanup(() => {
          if (!isTransactionAutomerge()) {
            docHandle.change((doc) => {
              delete doc[entity];
            });
          }
        });
        createComputed(
          mapArray(
            createMemo(() => world.getComponents(entity)),
            (component) => {
              let component2 = component as EcsComponent<object>;
              let componentTypeName = component.type.typeName;
              if (!isTransactionAutomerge()) {
                let componentJson = saveToJsonViaTypeSchema(
                  component2.type.typeSchema,
                  component2.state,
                );
                docHandle.change((doc) => {
                  doc[entity][componentTypeName] = componentJson;
                });
              }
              onCleanup(() => {
                if (!isTransactionAutomerge()) {
                  docHandle.change((doc) => {
                    delete doc[entity][componentTypeName];
                  });
                }
              });
              // shortcut (getting lazy)
              let componentJson = createMemo(() =>
                saveToJsonViaTypeSchema(
                  component2.type.typeSchema,
                  component2.state,
                ),
              );
              createComputed(
                on(componentJson, (componentJson) => {
                  if (!isTransactionAutomerge()) {
                    docHandle.change((doc) => {
                      let component = doc[entity][componentTypeName];
                      for (let key of Object.keys(componentJson)) {
                        component[key] = componentJson[key];
                      }
                    });
                  }
                }),
              );
            },
          ),
        );
      },
    ),
  );
}
