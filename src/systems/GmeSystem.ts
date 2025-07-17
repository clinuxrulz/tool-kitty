import { Chiptunes } from "../kitty-demo/Chiptunes3";

export function createGmeSystem(params: {
  fileUrl: string,
  onReady?: () => void,
}): {
  playMusic: (subtune: number) => void,
  playSound: (subtune: number) => void,
  subtuneCount: () => number,
} {
  params = params ?? {};
  let musicChiptunes: Chiptunes | undefined = undefined;
  let musicEmu: number | undefined = undefined;
  let soundChiptunes: Chiptunes | undefined = undefined;
  let soundEmu: number | undefined = undefined;
  let subtuneCount = 0;
  let initMusicSubtune: number | undefined = undefined;
  fetch(params.fileUrl)
    .then((x) => x.arrayBuffer())
    .then(async (data) => {
      {
        let musicChiptunes2 = await Chiptunes.init();
        musicChiptunes = musicChiptunes2;
        let r = await musicChiptunes2.load(data);
        if (r.type == "Err") {
          console.log(r.message);
        } else {
          let { emu, subtuneCount: subtuneCount2, } = r.value;
          musicEmu = emu;
          subtuneCount = subtuneCount2;
          if (initMusicSubtune != undefined) {
            musicChiptunes2.play(musicEmu, initMusicSubtune);
          }
        }
      }
      {
        let soundChiptunes2 = await Chiptunes.init();
        soundChiptunes = soundChiptunes2;
        let r = await soundChiptunes2.load(data);
        if (r.type == "Err") {
          console.log(r.message);
        } else {
          let { emu, } = r.value;
          soundEmu = emu;
        }
      }
      params.onReady?.();
    });
  return {
    playMusic: (subtune) => {
      if (musicChiptunes == undefined || musicEmu == undefined) {
        initMusicSubtune = subtune;
        return;
      }
      musicChiptunes.play(musicEmu, subtune);
    },
    playSound: (subtune) => {
      if (soundChiptunes == undefined || soundEmu == undefined) {
        return;
      }
      soundChiptunes.play(soundEmu, subtune);
    },
    subtuneCount() {
      return subtuneCount;
    },
  };
}