import { Component, createMemo, For, Show } from "solid-js";
import {
  EcsComponentType,
  EcsRegistry,
  makeDefaultViaTypeSchema,
  registry as registry2,
} from "./lib";
import { createStore } from "solid-js/store";
import AutoForm, { FormData } from "./AutoForm";
import { registry as registry1 } from "./level-builder/components/registry";

let _componentTypesSet = new Set([
  ...registry1.componentTypes,
  ...registry2.componentTypes,
]);

const registry = new EcsRegistry(Array.from(_componentTypesSet));

const AutoFormsTest: Component = (props) => {
  let [state, setState] = createStore<{
    componentTypeName: string | undefined;
  }>({
    componentTypeName: "Animated",
  });
  let formData = createMemo<FormData<any> | undefined>(() => {
    if (state.componentTypeName == undefined) {
      return undefined;
    }
    let componentType = registry.componentTypeMap.get(state.componentTypeName);
    if (componentType == undefined) {
      return undefined;
    }
    let [state2, setState2] = createStore(
      makeDefaultViaTypeSchema(
        (componentType as EcsComponentType<any>).typeSchema,
      ),
    );
    return {
      typeSchema: (componentType as EcsComponentType<any>).typeSchema,
      state: state2,
      setState: setState2,
    };
  });
  return (
    <div>
      <select
        value={state.componentTypeName}
        onChange={(e) => {
          setState("componentTypeName", e.currentTarget.value);
        }}
      >
        <For each={registry.componentTypes}>
          {(componentType) => (
            <option value={componentType.typeName}>
              {componentType.typeName}
            </option>
          )}
        </For>
      </select>
      <br />
      <Show when={formData()} keyed>
        {(formData) => <AutoForm formData={formData} />}
      </Show>
    </div>
  );
};

export default AutoFormsTest;
