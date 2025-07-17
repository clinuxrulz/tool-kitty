import {
  Component,
  createComputed,
  createEffect,
  createMemo,
  createResource,
  createSignal,
  For,
  mapArray,
  Match,
  on,
  onCleanup,
  onMount,
  Show,
  Switch,
  untrack,
} from "solid-js";
import { createStore, produce } from "solid-js/store";
import { NoTrack } from "../util";
import { makeQrForText } from "./qr_gen";
import QrScanner from "qr-scanner";
import * as pako from "pako";
import { createConnectionsUiForPeerJs } from "./ConnectionsUiForPeerJs";

const AutomergeWebRtcTest: Component = () => {
  let [state, setState] = createStore<{
    offer: NoTrack<RTCSessionDescriptionInit> | undefined;
    answer: NoTrack<RTCSessionDescriptionInit> | undefined;
    iceCandidates: NoTrack<RTCIceCandidate>[];
    connectionEstablished: boolean;
    doScanOffer: boolean;
    doScanAnswer: boolean;
    doScanIce: boolean;
    messages: string[];
  }>({
    offer: undefined,
    answer: undefined,
    iceCandidates: [],
    connectionEstablished: false,
    doScanOffer: false,
    doScanAnswer: false,
    doScanIce: false,
    messages: [],
  });
  const configuration = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  };
  const peerConnection = new RTCPeerConnection(configuration);
  const msgDataChannel = peerConnection.createDataChannel("msg");
  (async () => {
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    setState("offer", new NoTrack(offer));
  })();
  peerConnection.addEventListener("icecandidate", (event) => {
    if (event.candidate != null) {
      let candidate = event.candidate;
      setState(
        "iceCandidates",
        produce((x) => x.push(new NoTrack(candidate))),
      );
    }
  });
  peerConnection.addEventListener("connectionstatechange", (e) => {
    if (peerConnection.connectionState == "connected") {
      setState("connectionEstablished", true);
    }
  });
  msgDataChannel.addEventListener("open", (e) => {
    console.log(e);
  });
  msgDataChannel.addEventListener("close", (e) => {
    console.log(e);
  });
  msgDataChannel.addEventListener("message", (e) => {
    setState(
      "messages",
      produce((messages) => messages.push(e.data)),
    );
  });
  peerConnection.addEventListener("datachannel", (e) => {
    console.log(e);
    e.channel.addEventListener("message", (e) => {
      setState(
        "messages",
        produce((x) => x.push(e.data)),
      );
    });
  });
  let offerDataCompressed = createMemo(() => {
    let offer = state.offer?.value;
    if (offer == undefined) {
      return undefined;
    }
    let data = JSON.stringify(offer);
    let encoder = new TextEncoder();
    let data2 = encoder.encode(data);
    let data3 = pako.gzip(data2);
    let data4 = uint8ArrayToBase64(data3);
    return data4;
  });
  let decompressOfferData = (offerData: string): RTCSessionDescriptionInit => {
    let data = base64ToArrayBuffer(offerData);
    let data2 = pako.ungzip(data);
    let decoder = new TextDecoder("utf-8");
    let data3 = decoder.decode(data2);
    let data4 = JSON.parse(data3);
    return data4;
  };
  let answerDataCompressed = createMemo(() => {
    let answer = state.answer?.value;
    if (answer == undefined) {
      return undefined;
    }
    let data = JSON.stringify(answer);
    let encoder = new TextEncoder();
    let data2 = encoder.encode(data);
    let data3 = pako.gzip(data2);
    let data4 = uint8ArrayToBase64(data3);
    return data4;
  });
  let decompressAnswerData = (
    answerData: string,
  ): RTCSessionDescriptionInit => {
    let data = base64ToArrayBuffer(answerData);
    let data2 = pako.ungzip(data);
    let decoder = new TextDecoder("utf-8");
    let data3 = decoder.decode(data2);
    let data4 = JSON.parse(data3);
    return data4;
  };
  let iceDataCompressed = createMemo(() => {
    let ice = state.iceCandidates.map((x) => x.value);
    let data = JSON.stringify(ice);
    let encoder = new TextEncoder();
    let data2 = encoder.encode(data);
    let data3 = pako.gzip(data2);
    let data4 = uint8ArrayToBase64(data3);
    return data4;
  });
  let decompressIceData = (iceData: string): RTCIceCandidate[] => {
    let data = base64ToArrayBuffer(iceData);
    let data2 = pako.ungzip(data);
    let decoder = new TextDecoder("utf-8");
    let data3 = decoder.decode(data2);
    let data4 = JSON.parse(data3);
    return data4;
  };
  let OfferQR: Component = () => (
    <Show when={offerDataCompressed()} keyed={true}>
      {(data) => {
        let [offerQrDataUrl] = createResource(() => makeQrForText(data));
        return (
          <Show when={offerQrDataUrl()}>
            {(dataUrl) => <img src={dataUrl()} />}
          </Show>
        );
      }}
    </Show>
  );
  let OfferScannerDoScan: Component = () => {
    let [videoEl, setVideoEl] = createSignal<HTMLVideoElement>();
    onMount(async () => {
      let videoEl2 = videoEl();
      if (videoEl2 == undefined) {
        return;
      }
      const qrScanner = new QrScanner(
        videoEl2,
        async (result) => {
          let offer = decompressOfferData(result.data);
          console.log(offer);
          await qrScanner.stop();
          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(offer),
          );
          let answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);
          setState("answer", new NoTrack(answer));
          setState("doScanOffer", false);
        },
        {
          highlightScanRegion: true,
        },
      );
      await qrScanner.start();
    });
    return (
      <div style="position: relative;">
        <video
          ref={setVideoEl}
          style={{
            border: "1px solid green",
            width: "300px",
            height: "300px",
          }}
          disablepictureinpicture
        />
      </div>
    );
  };
  let OfferScanner: Component = () => (
    <Switch>
      <Match when={!state.doScanOffer}>
        <button class="btn" onClick={() => setState("doScanOffer", true)}>
          Do Scan
        </button>
      </Match>
      <Match when={state.doScanOffer}>
        <OfferScannerDoScan />
      </Match>
    </Switch>
  );
  let AnswerQR: Component = () => (
    <Show when={answerDataCompressed()} keyed={true}>
      {(data) => {
        let [answerQrDataUrl] = createResource(() => makeQrForText(data));
        return (
          <Show when={answerQrDataUrl()}>
            {(dataUrl) => <img src={dataUrl()} />}
          </Show>
        );
      }}
    </Show>
  );
  let AnswerScannerDoScan: Component = () => {
    let [videoEl, setVideoEl] = createSignal<HTMLVideoElement>();
    onMount(async () => {
      let videoEl2 = videoEl();
      if (videoEl2 == undefined) {
        return;
      }
      const qrScanner = new QrScanner(
        videoEl2,
        async (result) => {
          let answer = decompressAnswerData(result.data);
          console.log(answer);
          await qrScanner.stop();
          await peerConnection.setRemoteDescription(answer);
          setState("doScanAnswer", false);
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );
      await qrScanner.start();
    });
    return (
      <div style="position: relative;">
        <video
          ref={setVideoEl}
          style={{
            border: "1px solid green",
            width: "300px",
            height: "300px",
          }}
          disablepictureinpicture
        />
      </div>
    );
  };
  let AnswerScanner: Component = () => (
    <Switch>
      <Match when={!state.doScanAnswer}>
        <button class="btn" onClick={() => setState("doScanAnswer", true)}>
          Do Scan
        </button>
      </Match>
      <Match when={state.doScanAnswer}>
        <AnswerScannerDoScan />
      </Match>
    </Switch>
  );
  let IceQR: Component = () => (
    <Show when={iceDataCompressed()} keyed={true}>
      {(data) => {
        let [iceQrDataUrl] = createResource(() => makeQrForText(data));
        return (
          <Show when={iceQrDataUrl()}>
            {(dataUrl) => <img src={dataUrl()} />}
          </Show>
        );
      }}
    </Show>
  );
  let IceScannerDoScan: Component = () => {
    let [videoEl, setVideoEl] = createSignal<HTMLVideoElement>();
    onMount(async () => {
      let videoEl2 = videoEl();
      if (videoEl2 == undefined) {
        return;
      }
      const qrScanner = new QrScanner(
        videoEl2,
        async (result) => {
          let ice = decompressIceData(result.data);
          await qrScanner.stop();
          for (let ice2 of ice) {
            await peerConnection.addIceCandidate(ice2);
          }
        },
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        },
      );
      await qrScanner.start();
    });
    return (
      <div style="position: relative;">
        <video
          ref={setVideoEl}
          style={{
            border: "1px solid green",
            width: "300px",
            height: "300px",
          }}
          disablepictureinpicture
        />
      </div>
    );
  };
  let IceScanner: Component = () => (
    <Switch>
      <Match when={!state.doScanIce}>
        <button class="btn" onClick={() => setState("doScanIce", true)}>
          Do Scan
        </button>
      </Match>
      <Match when={state.doScanIce}>
        <IceScannerDoScan />
      </Match>
    </Switch>
  );
  let connectionsUiForPeerJs = createConnectionsUiForPeerJs();
  let hasPeerJsConnections = createMemo(
    () => connectionsUiForPeerJs.connections().length != 0,
  );
  createEffect(
    on(hasPeerJsConnections, (hasPeerJsConnections) => {
      if (hasPeerJsConnections) {
        setState("connectionEstablished", true);
      }
    }),
  );
  createComputed(
    mapArray(connectionsUiForPeerJs.connections, (connection) => {
      let onData = (x: any) => {
        setState(
          "messages",
          produce((x2) => x2.push(x)),
        );
      };
      connection.on("data", onData);
      onCleanup(() => connection.off("data", onData));
    }),
  );
  let sendMessageViaPeerJs = (message: string) =>
    untrack(() => {
      for (let connection of connectionsUiForPeerJs.connections()) {
        connection.send(message);
      }
    });
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        "overflow-y": "auto",
      }}
    >
      Automege WebRTC Test
      <br />
      Via PeerJs:
      <br />
      <connectionsUiForPeerJs.Render />
      <hr />
      Via QR Codes:
      <br />
      <Show when={!state.connectionEstablished}>
        <Show when={offerDataCompressed()}>
          {(offerDataCompressed2) => (
            <>
              Call:
              <button
                class="btn"
                onClick={async () => {
                  let data = offerDataCompressed2();
                  await navigator.clipboard.writeText(data);
                }}
              >
                Copy
              </button>
              <br />
              <OfferQR />
            </>
          )}
        </Show>
        <Show when={answerDataCompressed()}>
          {(answerDataCompressed2) => (
            <>
              Answer:
              <button
                class="btn"
                onClick={async () => {
                  let data = answerDataCompressed2();
                  await navigator.clipboard.writeText(data);
                }}
              >
                Copy
              </button>
              <br />
              <AnswerQR />
            </>
          )}
        </Show>
        <Show when={iceDataCompressed()}>
          {(iceDataCompressed2) => (
            <>
              Ice:
              <button
                class="btn"
                onClick={async () => {
                  let data = iceDataCompressed2();
                  await navigator.clipboard.writeText(data);
                }}
              >
                Copy
              </button>
              <br />
              <IceQR />
            </>
          )}
        </Show>
        Scan Offer:
        <button
          class="btn"
          onClick={async () => {
            let data = await navigator.clipboard.readText();
            let offer = decompressOfferData(data);
            await peerConnection.setRemoteDescription(offer);
            let answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            setState("answer", new NoTrack(answer));
          }}
        >
          Paste
        </button>
        <br />
        <OfferScanner />
        <br />
        Scan Answer:
        <button
          class="btn"
          onClick={async () => {
            let data = await navigator.clipboard.readText();
            let answer = decompressAnswerData(data);
            await peerConnection.setRemoteDescription(answer);
          }}
        >
          Paste
        </button>
        <br />
        <AnswerScanner />
        <br />
        Scan ICE:
        <button
          class="btn"
          onClick={async () => {
            let data = await navigator.clipboard.readText();
            let ice = decompressIceData(data);
            for (let ice2 of ice) {
              await peerConnection.addIceCandidate(ice2);
            }
          }}
        >
          Paste
        </button>
        <br />
        <IceScanner />
        <br />
      </Show>
      <Show when={state.connectionEstablished}>
        <For each={state.messages}>
          {(message) => (
            <>
              {message}
              <br />
            </>
          )}
        </For>
        Enter Message:
        <input
          style={{
            color: "black",
          }}
          onChange={(e) => {
            let text = e.currentTarget.value;
            setState(
              "messages",
              produce((x) => x.push(text)),
            );
            if (msgDataChannel.readyState == "open") {
              msgDataChannel.send(text);
            }
            sendMessageViaPeerJs(text);
            e.currentTarget.value = "";
          }}
        />
      </Show>
    </div>
  );
};

function uint8ArrayToBase64(bytes: Uint8Array): string {
  var binary = "";
  var len = bytes.byteLength;
  for (var i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): Uint8Array {
  var binary = atob(base64);
  var bytes = new Uint8Array(binary.length);
  for (var i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export default AutomergeWebRtcTest;
