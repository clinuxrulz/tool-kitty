import { Accessor, batch, createSignal, Signal } from "solid-js";

export class ClientBoundary {
  nextCallbackId: number = 0;
  callbacks: Map<number, (res: any) => void> = new Map();
  msgSender: (msg: any) => void;
  signalTable: Map<string, { signal: Signal<any>; refCount: number }> =
    new Map();

  constructor(msgSender: (msg: any) => void) {
    this.callbacks = new Map();
    this.msgSender = msgSender;
  }

  msgRecieved(msg: any): void {
    if (Object.hasOwn(msg, "callbackId")) {
      let callbackId = msg.callbackId;
      let msg2 = msg.msg;
      let callback = this.callbacks.get(callbackId);
      if (callback == undefined) {
        return;
      }
      callback(msg2);
    } else if (Object.hasOwn(msg, "type")) {
      if (msg.type == "Accessor Changes") {
        let accessors: { id: string; newValue: any }[] = msg.accessors;
        batch(() => {
          for (let accessor of accessors) {
            let signal = this.signalTable.get(accessor.id);
            if (signal != undefined) {
              signal.signal[1](accessor.newValue);
            }
          }
        });
      }
    }
  }

  private call(msg: any): Promise<any> {
    let callbackId = this.nextCallbackId++;
    return new Promise((resolve) => {
      this.callbacks.set(callbackId, resolve);
      this.msgSender({
        callbackId,
        msg,
      });
    });
  }

  async observeAccessor<A>(id: string): Promise<Accessor<A>> {
    {
      let signal = this.signalTable.get(id);
      if (signal != undefined) {
        signal.refCount++;
        return signal.signal[0];
      }
    }
    let initValue = await this.call({
      type: "observeAccessor",
      id,
    });
    let signal = createSignal<A>(initValue);
    this.signalTable.set(id, {
      signal,
      refCount: 1,
    });
    return signal[0];
  }

  unobserveAccessor(id: string) {
    let signal = this.signalTable.get(id);
    if (signal == undefined) {
      return;
    }
    signal.refCount--;
    if (signal.refCount == 0) {
      this.signalTable.delete(id);
      this.msgSender({
        type: "unobserveAccessor",
        id,
      });
    }
  }
}

export class ServerBoundary {
  msgSender: (msg: any) => void;

  constructor(msgSender: (msg: any) => void) {
    this.msgSender = msgSender;
  }

  msgRecieved(msg: any): void {
    // TODO
  }

  registerAccessor<A>(id: string, a: Accessor<A>): void {
    // TODO
  }
}
