import {
  Accessor,
  Component,
  createComputed,
  createSignal,
  For,
  Match,
  on,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { saveToJsonViaTypeSchema, TypeSchema } from "./TypeSchema";
import { createStore, SetStoreFunction, Store } from "solid-js/store";

export interface FormData<A extends object> {
  typeSchema: TypeSchema<A>;
  state: Store<A>;
  setState: SetStoreFunction<A>;
}

interface FormField<A> {
  fieldName: string;
  typeSchema: TypeSchema<A>;
  value: Accessor<A>;
  setValue: (a: A) => void;
}

const AutoForm: Component<{
  formData: FormData<any>;
}> = (props) => {
  return (
    <Show
      when={
        props.formData.typeSchema.type == "Object"
          ? props.formData.typeSchema
          : undefined
      }
      keyed
    >
      {(formData) => (
        <table>
          <thead />
          <tbody>
            <AutoFormObject prefix={undefined} formData={props.formData} />
          </tbody>
        </table>
      )}
    </Show>
  );
};

const AutoFormObject: Component<{
  prefix: string | undefined;
  formData: FormData<any>;
}> = (props) => {
  return (
    <Show
      when={
        props.formData.typeSchema.type == "Object"
          ? props.formData.typeSchema
          : undefined
      }
      keyed
    >
      {(formData) => (
        <For each={Object.entries(formData.properties)}>
          {([fieldName, fieldTypeSchema]) => {
            if (
              fieldTypeSchema.type == "Invarant" &&
              fieldTypeSchema.inner.type == "Object"
            ) {
              let [innerState, innerSetState] = createStore(
                fieldTypeSchema.toFn(props.formData.state[fieldName]),
              );
              createComputed(
                on(
                  () =>
                    saveToJsonViaTypeSchema(fieldTypeSchema.inner, innerState),
                  (innerState) => {
                    props.formData.setState(
                      fieldName,
                      fieldTypeSchema.fromFn(innerState),
                    );
                  },
                  { defer: true },
                ),
              );
              return (
                <AutoFormObject
                  prefix={fieldName}
                  formData={{
                    typeSchema: fieldTypeSchema.inner,
                    state: innerState,
                    setState: innerSetState,
                  }}
                />
              );
            } else if (fieldTypeSchema.type == "Object") {
              let [_, innerSetState] = createStore(
                props.formData.state[fieldName],
              );
              return (
                <AutoFormObject
                  prefix={fieldName}
                  formData={{
                    typeSchema: fieldTypeSchema,
                    state: props.formData.state[fieldName],
                    setState: innerSetState,
                  }}
                />
              );
            }
            return (
              <AutoFormField
                formField={{
                  fieldName:
                    props.prefix == undefined
                      ? fieldName
                      : `${props.prefix}.${fieldName}`,
                  typeSchema: fieldTypeSchema,
                  value: () => props.formData.state[fieldName],
                  setValue: (x) => props.formData.setState(fieldName, x),
                }}
              />
            );
          }}
        </For>
      )}
    </Show>
  );
};

const AutoFormField: Component<{
  formField: FormField<any>;
}> = (props) => {
  return (
    <tr>
      <td>{props.formField.fieldName}</td>
      <td>
        <Switch>
          <Match when={props.formField.typeSchema.type == "Boolean"}>
            <input
              type="checkbox"
              class="input"
              checked={props.formField.value() as boolean}
              onChange={(e) => {
                props.formField.setValue(e.currentTarget.checked);
              }}
            />
          </Match>
          <Match when={props.formField.typeSchema.type == "Number"}>
            {(() => {
              let [value, setValue] = createSignal(
                (untrack(() => props.formField.value()) as number).toString(),
              );
              createComputed(() => {
                let x = Number.parseFloat(value());
                if (Number.isNaN(x)) {
                  return;
                }
                props.formField.setValue(x);
              });
              return untrack(() => (
                <input
                  type="text"
                  class="input"
                  value={value()}
                  onInput={(e) => {
                    setValue(e.currentTarget.value);
                  }}
                />
              ));
            })()}
          </Match>
          <Match when={props.formField.typeSchema.type == "String"}>
            <input
              type="text"
              class="input"
              value={props.formField.value() as string}
              onInput={(e) => {
                props.formField.setValue(e.currentTarget.value);
              }}
            />
          </Match>
        </Switch>
      </td>
    </tr>
  );
};

export default AutoForm;
