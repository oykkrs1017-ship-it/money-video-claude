import React from "react";
import { Composition } from "remotion";
import { MainVideo } from "./compositions/MainVideo";
import { ShortsVideo } from "./compositions/ShortsVideo";
import { SlidesVideo } from "./compositions/SlidesVideo";
import { EndingSequence, ENDING_DURATION_SEC } from "./components/EndingSequence";
import { ScriptInput } from "./utils/types";
import { buildTimeline } from "@money-video/domain";
import {
  CardList,
  CompTableComp,
  RadarChartComp,
  MatrixComp,
  ProsConsComp,
  ScoringComp,
  DiffHighlightComp,
  RecommendComp,
} from "./components/comparison";
// script-input.json を直接 import → 編集するたびに自動反映
import scriptInput from "../input/script-input.json";
// グローバルフォント（Noto Sans JP: モダン・柔らかい日本語）
import { loadFont as loadNotoSansJP } from "@remotion/google-fonts/NotoSansJP";
loadNotoSansJP();
// chalk-board テーマ用フォント（Yusei Magic: 手書きチョーク風）
import { loadFont as loadYuseiMagic } from "@remotion/google-fonts/YuseiMagic";
loadYuseiMagic();

const FPS = 30;
const ENDING_FRAMES = Math.round(ENDING_DURATION_SEC * FPS);

export const RemotionRoot: React.FC = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedInput = scriptInput as any as ScriptInput;

  return (
    <>
      <Composition
        id="MainVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MainVideo as any}
        durationInFrames={300}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          scriptInput: typedInput,
        }}
        calculateMetadata={({ props }) => {
          const { totalFrames } = buildTimeline(props.scriptInput, FPS);
          return { durationInFrames: totalFrames + ENDING_FRAMES };
        }}
      />
      <Composition
        id="ShortsVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ShortsVideo as any}
        durationInFrames={300}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          scriptInput: typedInput,
        }}
        calculateMetadata={({ props }) => {
          const { timeline, titleFrames } = buildTimeline(props.scriptInput, FPS);
          const hookEntries = timeline.filter((e) => e.chapterIndex === 0);
          const hookEndFrame = hookEntries.length > 0
            ? hookEntries[hookEntries.length - 1].endFrame
            : titleFrames + FPS * 30;
          return { durationInFrames: hookEndFrame };
        }}
      />
      <Composition
        id="SlidesVideo"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SlidesVideo as any}
        durationInFrames={300}
        fps={FPS}
        width={1920}
        height={1080}
        defaultProps={{
          scriptInput: typedInput,
        }}
        calculateMetadata={({ props }) => {
          const { totalFrames } = buildTimeline(props.scriptInput, FPS);
          return { durationInFrames: totalFrames + ENDING_FRAMES };
        }}
      />
      <Composition
        id="EndingVideo"
        component={EndingSequence}
        durationInFrames={ENDING_FRAMES}
        fps={FPS}
        width={1920}
        height={1080}
      />
      {/* ── Comparison Components (8 types) ── */}
      <Composition
        id="ComparisonCardList"
        component={CardList}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComparisonTable"
        component={CompTableComp}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComparisonRadarChart"
        component={RadarChartComp}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComparisonMatrix"
        component={MatrixComp}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComparisonProsCons"
        component={ProsConsComp}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComparisonScoring"
        component={ScoringComp}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComparisonDiffHighlight"
        component={DiffHighlightComp}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ComparisonRecommend"
        component={RecommendComp}
        durationInFrames={180}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
