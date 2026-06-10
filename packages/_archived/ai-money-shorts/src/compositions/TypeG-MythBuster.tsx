/**
 * TypeG-MythBuster.tsx — 誤解解消型コンポジション
 *
 * 構造: 通説 → 反証 → 正解 → 実践（40-50秒推奨）
 *
 * 演出:
 *   - 「通説」セクションでは大きな ✕ アイコン + 打ち消し線オーバーレイ
 *   - 「正解」セクションでは ✓ チェックマーク + グロウ演出
 *   - セクション間に MYTH / FACT バッジを表示
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
import { Z } from '../styles/zIndex';
import { buildTimeline } from './shared/buildTimeline';
import { getVariation } from '../utils/variationEngine';

interface TypeGProps {
  episode: Episode;
}

/** セクション名からバッジ種別を判定 */
function classifySection(name: string): 'myth' | 'fact' | 'none' {
  const n = name.toLowerCase();
  if (['myth', '通説', '誤解', 'misconception', 'wrong'].some((k) => n.includes(k))) return 'myth';
  if (['fact', '正解', '真実', 'truth', 'correct', '正しい'].some((k) => n.includes(k))) return 'fact';
  return 'none';
}

/** MYTH / FACT バッジ（セクション冒頭 50 フレーム） */
const SectionBadge: React.FC<{
  kind: 'myth' | 'fact';
  accentColor: string;
}> = ({ kind, accentColor }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scaleSpring = spring({ frame, fps, config: { damping: 10, stiffness: 260 } });
  const fadeOut = interpolate(frame, [40, 50], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const isMythBadge = kind === 'myth';
  const badgeColor = isMythBadge ? '#F44336' : accentColor;
  const icon = isMythBadge ? '✕' : '✓';
  const label = isMythBadge ? 'MYTH' : 'FACT';

  return (
    <div
      style={{
        position: 'absolute',
        top: '38%',
        left: '50%',
        transform: `translate(-50%, -50%) scale(${scaleSpring})`,
        opacity: fadeOut,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
        zIndex: Z.HOOK_SPLASH,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: 160,
          lineHeight: 1,
          color: badgeColor,
          textShadow: `0 0 60px ${badgeColor}, 0 0 120px ${badgeColor}80`,
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 900,
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 60,
          fontWeight: 900,
          color: badgeColor,
          letterSpacing: 12,
          textShadow: `0 0 30px ${badgeColor}`,
        }}
      >
        {label}
      </div>
    </div>
  );
};

/** 打ち消し線オーバーレイ（MYTH セクション中に表示） */
const StrikethroughOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const width = interpolate(frame, [0, 20], [0, 100], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        width: `${width}%`,
        height: 8,
        background: 'rgba(244,67,54,0.85)',
        boxShadow: '0 0 20px rgba(244,67,54,0.6)',
        transform: 'translateY(-50%)',
        zIndex: Z.TELOP - 1,
        pointerEvents: 'none',
      }}
    />
  );
};

export const TypeGMythBuster: React.FC<TypeGProps> = ({ episode }) => {
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

  const pinFrame = sectionTimings[1]?.startFrame ?? 90;

  // MYTH セクション判定（打ち消し線表示用）
  const currentSectionKind = currentSection ? classifySection(currentSection.name) : 'none';
  const isMythSection = currentSectionKind === 'myth';

  return (
    <AbsoluteFill>
      {/* 音声 */}
      <AudioTrack timeline={{ entries, sectionTimings, totalFrames, ctaStartFrame }} sections={episode.sections} />

      <BackgroundScene color={bgColor} pattern="gradient" />

      {/* セクション冒頭 MYTH / FACT バッジ */}
      {sectionTimings.map((st, i) => {
        const kind = classifySection(st.section.name);
        if (kind === 'none') return null;
        const localFrame = frame - st.startFrame;
        if (localFrame < 0 || localFrame >= 50) return null;
        return (
          <Sequence key={i} from={st.startFrame} durationInFrames={50}>
            <SectionBadge kind={kind} accentColor={variation.accentColor} />
          </Sequence>
        );
      })}

      {/* MYTH セクション中の打ち消し線 */}
      {isMythSection && currentSectionTiming && (
        <Sequence
          from={currentSectionTiming.startFrame + 20}
          durationInFrames={currentSectionTiming.endFrame - currentSectionTiming.startFrame - 20}
        >
          <StrikethroughOverlay />
        </Sequence>
      )}

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
