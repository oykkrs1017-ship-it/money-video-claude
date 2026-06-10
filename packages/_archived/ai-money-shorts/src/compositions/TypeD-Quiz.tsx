import React from 'react';
import {
  AbsoluteFill,
  Sequence,
  useCurrentFrame,
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

interface TypeDProps {
  episode: Episode;
}

const isAnswerSection = (name: string) =>
  ['answer', '答え', '正解', 'result'].some((k) => name.toLowerCase().includes(k));

export const TypeDQuiz: React.FC<TypeDProps> = ({ episode }) => {
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

  const pinFrame =
    sectionTimings.find((st) =>
      st.section.visuals.some((v) => v.type === 'quiz-choice'),
    )?.startFrame ?? sectionTimings[1]?.startFrame ?? 90;

  // 正解発表セクション（SE 用）
  const answerSectionStart = sectionTimings.find((st) =>
    isAnswerSection(st.section.name),
  )?.startFrame;

  // シンキングタイム（選択肢セクション期間中にカウントダウン表示）
  const choiceSection = sectionTimings.find((st) =>
    st.section.visuals.some((v) => v.type === 'quiz-choice'),
  );

  return (
    <AbsoluteFill>
      {/* 音声 */}
      <AudioTrack timeline={{ entries, sectionTimings, totalFrames, ctaStartFrame }} sections={episode.sections} />

      {/* 正解発表SE */}
      {answerSectionStart !== undefined && (
        <Sequence from={answerSectionStart} durationInFrames={45}>
          <Audio src={staticFile('sfx/se_up.mp3')} volume={0.6} />
        </Sequence>
      )}

      <BackgroundScene color={bgColor} pattern="gradient" />

      {/* キャラクター */}
      <CharacterLayer
        layout={variation.characterLayout}
        currentEntry={currentEntry}
        sectionIndex={currentSectionTiming?.sectionIndex ?? 0}
      />

      {/* シンキングタイムカウントダウン表示 */}
      {choiceSection &&
        frame >= choiceSection.startFrame &&
        frame < choiceSection.endFrame && (
          <ThinkingTimer
            sectionStart={choiceSection.startFrame}
            sectionEnd={choiceSection.endFrame}
            frame={frame}
          />
        )}

      {/* タイトル */}
      <DynamicTitle episodeTitle={episode.title} pinFrame={pinFrame} />

      {/* ビジュアル（ヒーロータイトル表示中は非表示 / quiz-choice は VisualLayer の QuizChoiceVisual が処理） */}
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

// シンキングタイムタイマー（右上コーナー）
function ThinkingTimer({
  sectionStart,
  sectionEnd,
  frame,
}: {
  sectionStart: number;
  sectionEnd: number;
  frame: number;
}) {
  const duration = sectionEnd - sectionStart;
  const elapsed = frame - sectionStart;
  const remaining = Math.ceil((duration - elapsed) / 30);
  const progress = elapsed / duration;

  const opacity = interpolate(frame, [sectionStart, sectionStart + 10], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        position: 'absolute',
        top: 40,
        right: 40,
        width: 100,
        height: 100,
        borderRadius: '50%',
        border: `6px solid ${SETTINGS.colors.accentGold}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Montserrat, sans-serif',
        fontSize: 48,
        fontWeight: 900,
        color: SETTINGS.colors.accentGold,
        opacity,
        background: `conic-gradient(${SETTINGS.colors.accentGold} ${(1 - progress) * 360}deg, rgba(255,255,255,0.1) 0deg)`,
      }}
    >
      <span
        style={{
          position: 'absolute',
          color: SETTINGS.colors.accentGold,
          fontSize: 48,
          fontWeight: 900,
        }}
      >
        {Math.max(0, remaining)}
      </span>
    </div>
  );
}
