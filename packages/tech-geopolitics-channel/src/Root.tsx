import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./compositions/MainVideo";
import { ScriptInput } from "./utils/types";
// script-input.json を直接 import → 編集するたびに自動反映
import scriptInput from "../input/script-input.json";

const FPS = 30;
const TITLE_FRAMES = FPS * 2; // 冒頭タイトル 2秒
const TAIL_FRAMES = FPS * 1;  // 末尾余白 1秒

/** スクリプトから総フレーム数を計算 */
function calcDuration(s: ScriptInput): number {
  const contentFrames = s.chapters.reduce((total, ch) =>
    total + ch.lines.reduce((t, l) => t + (l.frameCount ?? FPS * 3), 0), 0
  );
  return TITLE_FRAMES + contentFrames + TAIL_FRAMES;
}

export const RemotionRoot: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedInput = scriptInput as any as ScriptInput;
  const duration = calcDuration(typedInput);

  return (
    <>
      <Composition
        id="MainVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MainVideo as any}
        durationInFrames={duration}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          scriptInput: typedInput,
        }}
      />
    </>
  );
};
