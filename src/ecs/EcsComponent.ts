import { createStore, SetStoreFunction, Store } from "solid-js/store";
import { err, ok, Result } from "../kitty-demo/Result";
import {
  createJsonProjectionViaTypeSchemaV2,
  loadFromJsonViaTypeSchema,
  saveToJsonViaTypeSchema,
  TypeSchema,
} from "../TypeSchema";
import { Accessor, createComputed, createMemo, on, untrack } from "solid-js";
import { projectMutableOverAutomergeDoc } from "../automerge-doc-mutable-proxy";

export interface IsEcsComponentType {
  readonly typeName: string;
}

export interface IsEcsComponent {
  readonly type: IsEcsComponentType;
}

export class EcsComponentType<S extends object> implements IsEcsComponentType {
  readonly typeName: string;
  readonly typeSchema: TypeSchema<S>;

  constructor(params: { typeName: string; typeSchema: TypeSchema<S> }) {
    this.typeName = params.typeName;
    this.typeSchema = params.typeSchema;
  }

  create(s: S): EcsComponent<S> {
    let [state, setState] = createStore(s);
    return new EcsComponent({
      type: this,
      state,
      setState,
    });
  }

  createJsonProjectionV3(
    json: any,
    changeJson: (callback: (json: any) => void) => void,
  ): Result<EcsComponent<S>> {
    let projection = projectMutableOverAutomergeDoc(
      json,
      changeJson,
      this.typeSchema,
    );
    let [_state, setState] = untrack(() => createStore(projection));
    return ok(
      new EcsComponent({
        type: this,
        state: projection,
        setState,
      }),
    );
  }

  createJsonProjectionV2(
    json: any,
    changeJson: (callback: (json: any) => void) => void,
  ): Result<EcsComponent<S>> {
    let projection = createJsonProjectionViaTypeSchemaV2(
      this.typeSchema,
      json,
      changeJson,
    );
    if (projection.type == "Err") {
      return err(projection.message);
    }
    let projection2 = projection.value;
    let [state, setState] = untrack(() => createStore(projection2));
    return ok(
      new EcsComponent({
        type: this,
        state,
        setState,
      }),
    );
  }

  createJsonProjection(
    json: Accessor<any>,
    setJson: (x: any) => void,
  ): Accessor<Result<EcsComponent<S>>> {
    let state = createMemo(() =>
      loadFromJsonViaTypeSchema(this.typeSchema, json()),
    );
    let state2_ = createMemo(
      () => {
        let s = state();
        if (s.type == "Err") {
          return s;
        }
        let state3 = state as Accessor<{ type: "Ok"; value: S }>;
        return ok(state3);
      },
      undefined,
      {
        equals: (a, b) => {
          if (a.type == "Ok" && b.type == "Ok") {
            return a.value == b.value;
          } else {
            return false;
          }
        },
      },
    );
    let state2 = createMemo(() => {
      let tmp = state2_();
      if (tmp.type == "Err") {
        return tmp;
      }
      return ok(
        createMemo(() => {
          return tmp.value().value;
        }),
      );
    });
    let result_ = createMemo(() => {
      let state3 = state2();
      if (state3.type == "Err") {
        return state3;
      }
      let state4 = state3.value;
      return ok(
        createMemo(() => {
          let [state5, setState] = createStore(untrack(state4));
          createComputed(
            on(state4, (state4) => setState(state4), { defer: true }),
          );
          let stateJson = createMemo(
            () => {
              let json = saveToJsonViaTypeSchema(this.typeSchema, state5);
              return {
                json,
                jsonString: JSON.stringify(json),
              };
            },
            undefined,
            {
              equals: (a, b) => a.jsonString == b.jsonString,
            },
          );
          createComputed(
            on(
              () => stateJson().json,
              (stateJson2) => {
                setJson(stateJson2);
              },
              { defer: true },
            ),
          );
          return new EcsComponent({
            type: this,
            state: state5,
            setState: setState,
          });
        }),
      );
    });
    return createMemo(() => {
      let tmp = result_();
      if (tmp.type == "Err") {
        return tmp;
      }
      return ok(tmp.value());
    });
  }
}

export class EcsComponent<S extends object> implements IsEcsComponent {
  readonly type: EcsComponentType<S>;
  state: Store<S>;
  setState: SetStoreFunction<S>;

  constructor(params: {
    type: EcsComponentType<S>;
    state: Store<S>;
    setState: SetStoreFunction<S>;
  }) {
    this.type = params.type;
    this.state = params.state;
    this.setState = params.setState;
  }
}
