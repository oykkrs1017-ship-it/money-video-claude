import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./compositions/MainVideo";
// script-input.json を直接 import → 編集するたびに自動反映
import scriptInput from "../input/script-input.json";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MainVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MainVideo as any}
        durationInFrames={1800}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          scriptInput: scriptInput as any,
        }}
      />
    </>
  );
};
