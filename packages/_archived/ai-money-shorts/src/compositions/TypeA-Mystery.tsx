import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import type { Episode } from '../types/episode';
import { CharacterLayer } from '../components/CharacterLayer';
import { BackgroundScene } from '../components/BackgroundScene';
import { VisualLayer } from '../components/VisualLayer';
import { SubtitleLayer } from '../components/SubtitleLayer';
import { AudioTrack } from '../components/AudioTrack';
import { ProgressBar } from '../components/ProgressBar';
import { CTA } from '../components/CTA';
import { DynamicTitle } from '../components/DynamicTitle';
import { SETTINGS } from '../settings.generated';
import { buildTimeline } from './shared/buildTimeline';
import { lerpColor } from '../utils/colorUtils';
import { getVariation } from '../utils/variationEngine';

interface TypeAProps {
  episode: Episode;
}

const TRANSITION_HALF = 15;

export const TypeAMystery: React.FC<TypeAProps> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { entries, sectionTimings, totalFrames, ctaStartFrame } = buildTimeline(episode);
  const seed = episode.variationSeed ?? episode.id;
  const variation = getVariation(seed);

  // 現在のセクション・エントリを特定（トランジション期間は直前セクションを維持）
  const currentSectionTiming =
    sectionTimings.find((s) => frame >= s.startFrame && frame < s.endFrame) ??
    [...sectionTimings].reverse().find((s) => frame >= s.startFrame) ??
    sectionTimings[sectionTimings.length - 1];
  const currentSection = currentSectionTiming?.section ?? null;

  const currentEntry =
    entries.find((e) => frame >= e.startFrame && frame <= e.endFrame) ?? null;

  // セクション間背景色グラデーション遷移（section.backgroundColor → variation.bgColor → SETTINGS のフォールバック）
  let bgColor: string = variation.bgColor;
  for (let i = 0; i < sectionTimings.length; i++) {
    const st = sectionTimings[i];
    const nextSt = sectionTimings[i + 1];
    const curColor = st.section.backgroundColor ?? variation.bgColor;
    if (frame >= st.startFrame && frame < st.endFrame) {
      if (nextSt && frame >= st.endFrame - TRANSITION_HALF) {
        const nextColor = nextSt.section.backgroundColor ?? variation.bgColor;
        const t = interpolate(
          frame,
          [st.endFrame - TRANSITION_HALF, st.endFrame + TRANSITION_HALF],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        );
        bgColor = lerpColor(curColor, nextColor, t);
      } else {
        bgColor = curColor;
      }
      break;
    }
  }

  // タイトルをヘッダーにピン留めするフレーム
  const pinFrame =
    sectionTimings.find((st) =>
      st.section.visuals.some((v) => v.type === 'graph' || v.type === 'stat'),
    )?.startFrame ??
    sectionTimings[1]?.startFrame ??
    90;

  const miniCtaStart = Math.floor(totalFrames * 0.45);
  const miniCtaDuration = 300;

  return (
    <AbsoluteFill>
      {/* 音声（BGM + セリフ） */}
      <AudioTrack timeline={{ entries, sectionTimings, totalFrames, ctaStartFrame }} sections={episode.sections} />

      {/* 背景 */}
      <BackgroundScene color={bgColor} pattern="gradient" />

      {/* キャラクター */}
      <CharacterLayer
        layout={variation.characterLayout}
        currentEntry={currentEntry}
        sectionIndex={currentSectionTiming?.sectionIndex ?? 0}
      />

      {/* タイトル */}
      <DynamicTitle episodeTitle={episode.title} pinFrame={pinFrame} />

      {/* ビジュアル（ヒーロータイトル表示中は非表示にして重なりを防ぐ） */}
      {currentSectionTiming && frame >= pinFrame && (
        <VisualLayer
          currentSection={currentSection}
          startFrame={currentSectionTiming.startFrame}
          endFrame={currentSectionTiming.endFrame}
          accentColor={variation.accentColor}
        />
      )}

      {/* 字幕 */}
      {currentEntry && (
        <SubtitleLayer
          line={currentEntry.line}
          localFrame={frame - currentEntry.startFrame}
          totalFrames={currentEntry.endFrame - currentEntry.startFrame}
        />
      )}

      {/* mini CTA */}
      {miniCtaStart < ctaStartFrame && (
        <Sequence from={miniCtaStart} durationInFrames={miniCtaDuration}>
          <CTA variant="mini" />
        </Sequence>
      )}

      {/* フル CTA */}
      <Sequence from={ctaStartFrame} durationInFrames={60}>
        <CTA variant="full" />
      </Sequence>

      {/* プログレスバー */}
      <ProgressBar totalFrames={totalFrames} />
    </AbsoluteFill>
  );
};
