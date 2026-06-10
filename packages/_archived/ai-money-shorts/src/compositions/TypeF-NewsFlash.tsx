/**
 * TypeF-NewsFlash.tsx — 速報型コンポジション
 *
 * 構造: 速報 → 背景 → 影響 → アクション（30-40秒推奨）
 *
 * 演出:
 *   - 冒頭に Breaking News バナー（赤帯 + 点滅テキスト）
 *   - 速報セクションでは画面全体に「⚡ 速報」ウォーターマーク
 *   - 各セクション冒頭でタイムスタンプ風カウンター
 */

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
import { VisualLayer } from '../components/VisualLayer';
import { SubtitleLayer } from '../components/SubtitleLayer';
import { AudioTrack } from '../components/AudioTrack';
import { ProgressBar } from '../components/ProgressBar';
import { CTA } from '../components/CTA';
import { DynamicTitle } from '../components/DynamicTitle';
import { SETTINGS } from '../settings.generated';
import { Z } from '../styles/zIndex';
import { buildTimeline } from './shared/buildTimeline';
import { getVariation } from '../utils/variationEngine';

interface TypeFProps {
  episode: Episode;
}

/** Breaking News バナー（冒頭 60 フレーム表示） */
const BreakingNewsBanner: React.FC<{ accentColor: string }> = ({ accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({ frame, fps, config: { damping: 14, stiffness: 220 } });
  const y = interpolate(slideIn, [0, 1], [-120, 0]);
  const opacity = interpolate(frame, [50, 60], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  // 「速報」文字の点滅（20フレーム周期）
  const blink = Math.floor(frame / 10) % 2 === 0;

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 110,
        background: `linear-gradient(90deg, #C62828 0%, ${accentColor} 100%)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        transform: `translateY(${y}px)`,
        opacity,
        zIndex: Z.HOOK_SPLASH,
      }}
    >
      <span
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 52,
          fontWeight: 900,
          color: '#fff',
          opacity: blink ? 1 : 0.3,
          letterSpacing: 4,
        }}
      >
        ⚡ 速報
      </span>
      <span
        style={{
          fontFamily: SETTINGS.font.family,
          fontSize: 38,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.9)',
        }}
      >
        BREAKING NEWS
      </span>
    </div>
  );
};

/** セクション冒頭のニュースタイムスタンプ風アクセント */
const SectionTimestamp: React.FC<{ sectionIndex: number; accentColor: string }> = ({
  sectionIndex,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 8, 45, 60], [0, 1, 1, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 120,
        left: 32,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        opacity,
        zIndex: Z.TELOP,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: accentColor,
          boxShadow: `0 0 12px ${accentColor}`,
        }}
      />
      <span
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 28,
          fontWeight: 600,
          color: accentColor,
          letterSpacing: 2,
        }}
      >
        PART {sectionIndex + 1}
      </span>
    </div>
  );
};

export const TypeFNewsFlash: React.FC<TypeFProps> = ({ episode }) => {
  const frame = useCurrentFrame();
  const { entries, sectionTimings, totalFrames, ctaStartFrame } = buildTimeline(episode);
  const variation = getVariation(episode.variationSeed ?? episode.id);

  const currentSectionTiming =
    sectionTimings.find((s) => frame >= s.startFrame && frame < s.endFrame) ??
    [...sectionTimings].reverse().find((s) => frame >= s.startFrame) ??
    sectionTimings[sectionTimings.length - 1];
  const currentSection = currentSectionTiming?.section ?? null;

  const currentEntry = entries.find((e) => frame >= e.startFrame && frame <= e.endFrame) ?? null;
  const bgColor = currentSection?.backgroundColor ?? variation.bgColor;

  const pinFrame = sectionTimings[1]?.startFrame ?? 60;

  return (
    <AbsoluteFill>
      {/* 音声 */}
      <AudioTrack timeline={{ entries, sectionTimings, totalFrames, ctaStartFrame }} sections={episode.sections} />

      <BackgroundScene color={bgColor} pattern="grid" />

      {/* 速報バナー（冒頭 60F） */}
      {frame < 60 && (
        <Sequence from={0} durationInFrames={60}>
          <BreakingNewsBanner accentColor={variation.accentColor} />
        </Sequence>
      )}

      {/* セクション冒頭タイムスタンプ */}
      {sectionTimings.map((st, i) => {
        const localFrame = frame - st.startFrame;
        if (localFrame < 0 || localFrame > 60) return null;
        return (
          <Sequence key={i} from={st.startFrame} durationInFrames={60}>
            <SectionTimestamp sectionIndex={i} accentColor={variation.accentColor} />
          </Sequence>
        );
      })}

      {/* キャラクター */}
      <CharacterLayer
        layout={variation.characterLayout}
        currentEntry={currentEntry}
        sectionIndex={currentSectionTiming?.sectionIndex ?? 0}
      />

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
