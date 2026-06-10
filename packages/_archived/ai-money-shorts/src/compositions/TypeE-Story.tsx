import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from 'remotion';
import type { Episode } from '../types/episode';
import { CharacterLayer } from '../components/CharacterLayer';
import { BackgroundScene } from '../components/BackgroundScene';
import { getVariation } from '../utils/variationEngine';
import { VisualLayer } from '../components/VisualLayer';
import { SubtitleLayer } from '../components/SubtitleLayer';
import { AudioTrack } from '../components/AudioTrack';
import { ProgressBar } from '../components/ProgressBar';
import { CTA } from '../components/CTA';
import { DynamicTitle } from '../components/DynamicTitle';
import { SETTINGS } from '../settings.generated';
import { Z } from '../styles/zIndex';
import { buildTimeline } from './shared/buildTimeline';

interface TypeEProps {
  episode: Episode;
}

const CINEMATIC_BAR_HEIGHT = 80;

/** セクション遷移フラッシュ（12フレーム） */
const SectionFlash: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 8, stiffness: 300 }, durationInFrames: 12 });
  const opacity = interpolate(progress, [0, 0.3, 1], [0.5, 0.3, 0], { extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: accentColor,
        opacity,
        pointerEvents: 'none',
        zIndex: Z.HOOK_SPLASH - 1,
      }}
    />
  );
};

/** シネマティック黒帯（上下それぞれ 80px）BAN 回避のためアニメーション付き */
const CinematicBars: React.FC<{ startFrame: number }> = ({ startFrame }) => {
  const frame = useCurrentFrame();
  const localFrame = frame - startFrame;
  const progress = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const h = CINEMATIC_BAR_HEIGHT * progress;

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: h, backgroundColor: '#000', zIndex: Z.CTA - 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: h, backgroundColor: '#000', zIndex: Z.CTA - 1,
        }}
      />
    </>
  );
};

export const TypeEStory: React.FC<TypeEProps> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { entries, sectionTimings, totalFrames, ctaStartFrame } = buildTimeline(episode);
  const variation = getVariation(episode.variationSeed ?? episode.id);

  // トランジション期間（セクション間）は直前のセクションを維持
  const currentSectionTiming =
    sectionTimings.find((s) => frame >= s.startFrame && frame < s.endFrame) ??
    [...sectionTimings].reverse().find((s) => frame >= s.startFrame) ??
    sectionTimings[sectionTimings.length - 1];
  const currentSection = currentSectionTiming?.section ?? null;

  const currentEntry = entries.find((e) => frame >= e.startFrame && frame <= e.endFrame) ?? null;
  const bgColor = currentSection?.backgroundColor ?? variation.bgColor;

  const pinFrame = sectionTimings[1]?.startFrame ?? 90;

  // ストーリーの転換点（"転" または "turn" を含むセクション）でシネマティック帯
  const turnSection = sectionTimings.find((st) =>
    ['転', 'turn', 'twist', '転換'].some((k) =>
      st.section.name.toLowerCase().includes(k),
    ),
  );

  return (
    <AbsoluteFill>
      {/* 音声 */}
      <AudioTrack timeline={{ entries, sectionTimings, totalFrames, ctaStartFrame }} sections={episode.sections} />

      <BackgroundScene color={bgColor} pattern="gradient" />

      {/* キャラクター */}
      <CharacterLayer
        layout={variation.characterLayout}
        currentEntry={currentEntry}
        sectionIndex={currentSectionTiming?.sectionIndex ?? 0}
      />

      {/* 転換点でシネマティック帯 */}
      {turnSection && frame >= turnSection.startFrame && (
        <CinematicBars startFrame={turnSection.startFrame} />
      )}

      {/* セクション遷移フラッシュ（pinFrame以降のセクション境界） */}
      {sectionTimings
        .filter((st) => st.startFrame > pinFrame)
        .map((st) => {
          const localFrame = frame - st.startFrame;
          if (localFrame < 0 || localFrame >= 12) return null;
          return (
            <Sequence key={`flash-${st.sectionIndex}`} from={st.startFrame} durationInFrames={12}>
              <SectionFlash accentColor={variation.accentColor} />
            </Sequence>
          );
        })}

      {/* タイトル */}
      <DynamicTitle episodeTitle={episode.title} pinFrame={pinFrame} />

      {/* ビジュアル（ヒーロータイトル表示中は非表示） */}
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

      <Sequence from={ctaStartFrame} durationInFrames={60}>
        <CTA />
      </Sequence>
      <ProgressBar totalFrames={totalFrames} />
    </AbsoluteFill>
  );
};
