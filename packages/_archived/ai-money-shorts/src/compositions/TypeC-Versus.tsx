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

interface TypeCProps {
  episode: Episode;
}

export const TypeCVersus: React.FC<TypeCProps> = ({ episode }) => {
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

  const pinFrame = sectionTimings[1]?.startFrame ?? 90;

  // VS 演出セクション（名前に vs / versus / 対決 / 比較 を含む）
  const vsSections = sectionTimings.filter((st) =>
    ['vs', 'versus', '対決', '比較'].some((k) =>
      st.section.name.toLowerCase().includes(k),
    ),
  );

  return (
    <AbsoluteFill>
      {/* 音声 */}
      <AudioTrack timeline={{ entries, sectionTimings, totalFrames, ctaStartFrame }} sections={episode.sections} />

      {/* VS 演出 SE */}
      {vsSections.map((st, i) => (
        <Sequence key={`se-${i}`} from={st.startFrame} durationInFrames={45}>
          <Audio src={staticFile('sfx/se_up.mp3')} volume={0.5} />
        </Sequence>
      ))}

      <BackgroundScene color={bgColor} pattern="dots" />

      {/* キャラクター */}
      <CharacterLayer
        layout={variation.characterLayout}
        currentEntry={currentEntry}
        sectionIndex={currentSectionTiming?.sectionIndex ?? 0}
      />

      {/* VS オーバーレイ（対決セクション冒頭60フレーム） */}
      {vsSections.map((st, i) => {
        const localFrame = frame - st.startFrame;
        if (localFrame < 0 || localFrame > 60) return null;
        const vsScale = spring({ frame: localFrame, fps, config: { damping: 8, stiffness: 250 } });
        const lineExpand = interpolate(localFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <React.Fragment key={i}>
            {/* 中央縦ライン */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: '50%',
                width: 4,
                height: `${lineExpand * 100}%`,
                background: `linear-gradient(to bottom, transparent, ${SETTINGS.colors.accentGold}, transparent)`,
                transform: 'translateX(-50%)',
                opacity: interpolate(localFrame, [0, 10, 50, 60], [0, 1, 1, 0]),
              }}
            />
            {/* VS テキスト */}
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(-50%, -50%) scale(${vsScale})`,
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 160,
                fontWeight: 900,
                color: SETTINGS.colors.accentGold,
                textShadow: `0 0 60px ${SETTINGS.colors.accentGold}, 0 0 120px ${SETTINGS.colors.accentGold}80`,
                opacity: interpolate(localFrame, [0, 8, 50, 60], [0, 1, 1, 0]),
                letterSpacing: 8,
              }}
            >
              VS
            </div>
          </React.Fragment>
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
