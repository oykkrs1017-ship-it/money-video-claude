import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Audio,
  staticFile,
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
import { buildTimeline } from './shared/buildTimeline';

interface TypeBProps {
  episode: Episode;
}

export const TypeBRanking: React.FC<TypeBProps> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { entries, sectionTimings, totalFrames, ctaStartFrame } = buildTimeline(episode);
  const variation = getVariation(episode.variationSeed ?? episode.id);

  const currentSectionTiming =
    sectionTimings.find((s) => frame >= s.startFrame && frame < s.endFrame) ??
    [...sectionTimings].reverse().find((s) => frame >= s.startFrame) ??
    sectionTimings[sectionTimings.length - 1];
  const currentSection = currentSectionTiming?.section ?? null;

  const currentEntry = entries.find((e) => frame >= e.startFrame && frame <= e.endFrame) ?? null;
  const bgColor = currentSection?.backgroundColor ?? variation.bgColor;

  // ランキングセクションを特定（ranking-item ビジュアルを含むセクション）
  const rankingSections = sectionTimings.filter((st) =>
    st.section.visuals.some((v) => v.type === 'ranking-item'),
  );

  const pinFrame = sectionTimings[1]?.startFrame ?? 90;

  return (
    <AbsoluteFill>
      {/* 音声 */}
      <AudioTrack timeline={{ entries, sectionTimings, totalFrames, ctaStartFrame }} sections={episode.sections} />

      {/* ランク発表SE */}
      {rankingSections.map((st, i) => (
        <Sequence key={`se-${i}`} from={st.startFrame} durationInFrames={45}>
          <Audio src={staticFile('sfx/se_up.mp3')} volume={0.4} />
        </Sequence>
      ))}

      <BackgroundScene color={bgColor} pattern="grid" />

      {/* キャラクター */}
      <CharacterLayer
        layout={variation.characterLayout}
        currentEntry={currentEntry}
        sectionIndex={currentSectionTiming?.sectionIndex ?? 0}
      />

      {/* ランキング番号スプラッシュ（ランキングセクション冒頭45フレーム） */}
      {rankingSections.map((st, i) => {
        const rankNum = rankingSections.length - i;
        const localFrame = frame - st.startFrame;
        if (localFrame < 0 || localFrame > 45) return null;
        const scale = spring({ frame: localFrame, fps, config: { damping: 10, stiffness: 200 } });
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: 80,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontFamily: 'Montserrat, sans-serif',
              fontSize: 180,
              fontWeight: 800,
              color: rankNum === 1 ? SETTINGS.colors.accentGold : SETTINGS.colors.textGray,
              textShadow: `0 0 40px ${rankNum === 1 ? SETTINGS.colors.accentGold : SETTINGS.colors.accentCyan}`,
              transform: `scale(${scale})`,
              opacity: interpolate(localFrame, [0, 10, 35, 45], [0, 1, 1, 0]),
            }}
          >
            {rankNum}位
          </div>
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
