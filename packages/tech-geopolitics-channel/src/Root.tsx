import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./compositions/MainVideo";
import type { MainVideoProps } from "./compositions/MainVideo";

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
          scriptInput: {
            videoId: "ep001",
            seed: "tech-invest-ep001",
            title: "半導体規制の裏側｜台湾TSMCと日本の未来",
            description: "YouTube説明欄に使うテキスト",
            tags: ["半導体", "TSMC", "地政学", "投資"],
            chapters: [
              {
                type: "hook",
                duration: 30,
                lines: [
                  { speaker: "zundamon", text: "ねえめたん、知ってた？今年の半導体規制で、日本企業の株価が大きく動いたのだ", emotion: "serious" },
                  { speaker: "metan", text: "え、そうなの？詳しく教えて！", emotion: "surprised" }
                ]
              },
              {
                type: "cta",
                duration: 30,
                lines: [
                  { speaker: "zundamon", text: "チャンネル登録と高評価をよろしくなのだ！", emotion: "happy" },
                  { speaker: "metan", text: "次回もお楽しみに！", emotion: "happy" }
                ]
              }
            ],
            chartData: {
              "tsmc-revenue": [
                { label: "2020", value: 47 },
                { label: "2021", value: 57 },
                { label: "2022", value: 76 },
                { label: "2023", value: 69 },
                { label: "2024", value: 88 },
                { label: "2025", value: 105 }
              ]
            }
          }
        }}
      />
    </>
  );
};
