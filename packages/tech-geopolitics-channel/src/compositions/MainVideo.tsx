import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { ScriptInput, ScriptLine } from '../utils/types';
import { buildTimeline, getVariation } from '@money-video/domain';
import { THEMES } from '../styles/themes';
import { ProgressBar } from '../components/ProgressBar';
import { TitleAnimation } from '../components/TitleAnimation';
import { BackgroundRenderer } from '../components/BackgroundRenderer';
import { TopicBadge } from '../components/TopicBadge';
import { AudioTrack } from '../components/AudioTrack';
import { SubtitleLayer } from '../components/SubtitleLayer';
import { CharacterLayer } from '../components/CharacterLayer';
import { VisualLayer } from '../components/VisualLayer';
import { CinematicLayer } from '../components/CinematicLayer';
import { ChapterCard } from '../components/ChapterCard';
import { CounterIntuitionLayer } from '../components/CounterIntuitionLayer';

export interface MainVideoProps {
  scriptInput: ScriptInput;
}

// Phase 1 rewire: buildTimeline の実体は @money-video/domain に移管。
// ここではそのまま呼び出す。

export const MainVideo: React.FC<MainVideoProps> = ({ scriptInput }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const variation = getVariation(scriptInput.seed);
  const theme = THEMES[variation.theme];
  const { timeline, totalFrames, titleFrames } = buildTimeline(scriptInput, fps);

  // 現在フレームに対応するセリフを検索
  const currentEntry = timeline.find((e) => frame >= e.startFrame && frame < e.endFrame) ?? null;
  const currentLine: ScriptLine | null = currentEntry?.line ?? null;
  const currentChapter = currentLine ? scriptInput.chapters[currentEntry!.chapterIndex] : null;

  // チャプター区切りフレーム（プログレスバー用）
  const chapterMarkers = scriptInput.chapters.reduce<number[]>((acc, _, ci) => {
    const firstEntry = timeline.find((e) => e.chapterIndex === ci);
    if (firstEntry) acc.push(firstEntry.startFrame);
    return acc;
  }, []);

  // チャプタータイムライン（AudioTrack に渡す chapterTimeline を構築）
  const chapterTimeline = timeline.map(({ chapterIndex, startFrame, endFrame }) => ({
    chapterIndex,
    startFrame,
    endFrame,
  }));

  // タイトル表示（冒頭2秒）
  const showTitle = frame < titleFrames;

  // H-05: 逆説層（冒頭15秒）- scriptInputにcounterIntuitionフラグがある場合のみ有効
  const isCounterIntuitionActive = !!(scriptInput as { counterIntuition?: boolean }).counterIntuition;

  const accentColor = theme.accent !== theme.background ? theme.accent : '#4a9eff';

  // チャプター境界フェードオーバーレイ（黒フェードイン/アウト）
  const FADE_FRAMES = 10;
  const chapterBoundaries = chapterMarkers.slice(1);
  let fadeOverlayOpacity = 0;
  for (const boundary of chapterBoundaries) {
    if (frame >= boundary - FADE_FRAMES && frame < boundary) {
      fadeOverlayOpacity = interpolate(frame, [boundary - FADE_FRAMES, boundary], [0, 1], { extrapolateRight: 'clamp' });
      break;
    }
    if (frame >= boundary && frame < boundary + FADE_FRAMES) {
      fadeOverlayOpacity = interpolate(frame, [boundary, boundary + FADE_FRAMES], [1, 0], { extrapolateRight: 'clamp' });
      break;
    }
  }

  // stat / chart ビジュアル表示中はキャラクターを控えめにしてビジュアルを前面に出す
  const visualType = currentLine?.visual?.type;
  const isFullScreenVisual = visualType === 'stat' || visualType === 'chart';
  // interpolate でフェード（0〜20フレームで変化）
  const relativeFrame = currentEntry ? frame - currentEntry.startFrame : 0;
  const charOpacity = isFullScreenVisual
    ? interpolate(relativeFrame, [0, 20], [1, 0.45], { extrapolateRight: 'clamp' })
    : 1;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', fontFamily: theme.fontFamily ?? 'inherit' }}>
      {/* 音声（BGM + セリフ） */}
      <AudioTrack
        timeline={timeline}
        bgm={scriptInput.bgm}
        bgmMap={scriptInput.bgmMap}
        bgmVolume={scriptInput.bgmVolume}
        seVolume={scriptInput.seVolume}
        totalFrames={totalFrames}
        chapters={scriptInput.chapters}
        chapterTimeline={chapterTimeline}
      />

      {/* 背景 */}
      <BackgroundRenderer type={variation.background} theme={theme} />

      {/* タイトルカード（冒頭2秒） */}
      {showTitle && (
        <>
          {/* 暗幕オーバーレイ */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)',
            zIndex: 15,
          }} />
          {/* チャンネル名バッジ */}
          <div style={{
            position: 'absolute', top: '28%', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 21,
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: 999,
            padding: '6px 28px',
          }}>
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 26, fontWeight: 600, letterSpacing: '0.15em' }}>
              テクノロジー投資 × 地政学
            </span>
          </div>
          {/* メインタイトル */}
          <TitleAnimation
            title={scriptInput.title}
            style={variation.titleStyle}
            startFrame={0}
            color="#ffffff"
            fontSize={Math.floor(width * 0.055)}
          />
          {/* 下部アクセントライン */}
          <div style={{
            position: 'absolute', bottom: '30%', left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 21,
            width: interpolate(frame, [0, fps * 1.5], [0, 320], { extrapolateRight: 'clamp' }),
            height: 3,
            backgroundColor: accentColor,
            borderRadius: 2,
          }} />
        </>
      )}

      {/* キャラクター（stat/chart ビジュアル時は透明度を下げてビジュアルを前面に出す） */}
      {!showTitle && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none', opacity: charOpacity }}>
          <CharacterLayer
            currentLine={currentLine}
            characterLayout={variation.characterLayout}
            height={height}
          />
        </div>
      )}

      {/* ビジュアル（チャート・キーワード・画像など） */}
      <VisualLayer
        currentChapter={currentChapter}
        currentLine={currentLine}
        currentEntry={currentEntry}
        timeline={timeline}
        scriptInput={scriptInput}
        theme={theme}
        showTitle={showTitle}
        width={width}
        height={height}
      />

      {/* シネマティック演出（ヴィネット・フラッシュ・レターボックス） */}
      <CinematicLayer
        currentLine={currentLine}
        currentEntry={currentEntry}
        chapterType={currentChapter?.type ?? null}
      />

      {/* トピックバッジ（左上・テレビ局風） */}
      {!showTitle && currentChapter?.topic && (() => {
        const ci = scriptInput.chapters.indexOf(currentChapter);
        const chapterStart = timeline.find((e) => e.chapterIndex === ci)?.startFrame ?? fps * 2;
        return (
          <TopicBadge
            topic={currentChapter.topic}
            chapterType={currentChapter.type}
            startFrame={chapterStart}
            accentColor={accentColor}
          />
        );
      })()}

      {/* 字幕 */}
      {!showTitle && (
        <SubtitleLayer
          currentLine={currentLine}
          currentEntry={currentEntry}
          subtitleStyle={variation.subtitleStyle}
        />
      )}

      {/* チャプターカード: 削除（メタ情報が透けるため） */}

      {/* H-05: 逆説層 CounterIntuitionLayer（Hook冒頭15秒・isActive=trueのepのみ） */}
      <CounterIntuitionLayer
        startFrame={0}
        endFrame={fps * 15}
        accentColor={accentColor}
        isActive={isCounterIntuitionActive}
      />

      {/* プログレスバー */}
      <ProgressBar
        totalFrames={totalFrames}
        color={theme.accent}
        chapterMarkers={chapterMarkers}
        position="bottom"
      />

      {/* チャプタートランジション（blur + cinematic fade） */}
      {fadeOverlayOpacity > 0 && (
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse at 50% 50%, rgba(10,12,30,0.92) 0%, rgba(0,0,0,1) 100%)',
          opacity: fadeOverlayOpacity,
          backdropFilter: `blur(${(fadeOverlayOpacity * 7).toFixed(1)}px)`,
          WebkitBackdropFilter: `blur(${(fadeOverlayOpacity * 7).toFixed(1)}px)`,
          zIndex: 200,
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
};

export default MainVideo;
