import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, Img, staticFile, Sequence } from 'remotion';
import { EndingSequence, ENDING_DURATION_SEC } from '../components/EndingSequence';
import { ScriptInput, ScriptLine } from '../utils/types';
import { buildTimeline, getVariation } from '@money-video/domain';
import { THEMES } from '../styles/themes';
import { ProgressBar } from '../components/ProgressBar';
import { TitleAnimation } from '../components/TitleAnimation';
import { BackgroundRenderer } from '../components/BackgroundRenderer';
import { TopicBadge } from '../components/TopicBadge';
import { AudioTrack } from '../components/AudioTrack';
import { SubtitleLayer } from '../components/SubtitleLayer';
import { ZundamonStage } from '../components/ZundamonStage';
import { MetanStage } from '../components/MetanStage';
import { CinematicLayer } from '../components/CinematicLayer';
import slideMapRaw from '../../out/html-slides/slide-map.json';

export interface SlidesVideoProps {
  scriptInput: ScriptInput;
}

interface SlideMapEntry {
  slideNum: number;
  slidePng: string;
  type: string;
  audioFile?: string;        // 単一audio（後方互換）
  audioFiles?: string[];     // 統合スライドで複数audioにラッチ
  chapterIndex?: number;     // sectionタイプ: どのchapterの冒頭に表示するか
}

const slideMap = slideMapRaw as SlideMapEntry[];

// audioFile → slidePng のマッピング（visual タイプのみ）
// 統合スライドの場合は audioFiles[] の全エントリが同じ slidePng を指す
const audioToSlide = new Map<string, string>();
for (const e of slideMap) {
  if (e.type !== 'visual') continue;
  const files = e.audioFiles ?? (e.audioFile ? [e.audioFile] : []);
  for (const f of files) audioToSlide.set(f, e.slidePng);
}

// chapterIndex → sectionSlidePng のマッピング（section タイプ）
// 各チャプター冒頭2秒間はこのスライドを優先表示する
const chapterToSection = new Map<number, string>();
for (const e of slideMap) {
  if (e.type === 'section' && e.chapterIndex !== undefined) {
    chapterToSection.set(e.chapterIndex, e.slidePng);
  }
}

export const SlidesVideo: React.FC<SlidesVideoProps> = ({ scriptInput }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const variation = getVariation(scriptInput.seed);
  const theme = THEMES[variation.theme];
  // SlidesVideo はタイトルカードを使わない（スライドが冒頭から始まる）
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { timeline, totalFrames, titleFrames } = buildTimeline({ ...(scriptInput as any), hideTitleCard: true }, fps);
  const endingFrames = Math.round(ENDING_DURATION_SEC * fps);

  const currentEntry = timeline.find(e => frame >= e.startFrame && frame < e.endFrame) ?? null;
  const currentLine: ScriptLine | null = currentEntry?.line ?? null;
  const currentChapter = currentLine ? scriptInput.chapters[currentEntry!.chapterIndex] : null;

  const chapterMarkers = scriptInput.chapters.reduce<number[]>((acc, _, ci) => {
    const firstEntry = timeline.find(e => e.chapterIndex === ci);
    if (firstEntry) acc.push(firstEntry.startFrame);
    return acc;
  }, []);

  const chapterTimeline = timeline.map(({ chapterIndex, startFrame, endFrame }) => ({
    chapterIndex,
    startFrame,
    endFrame,
  }));

  const showTitle = frame < titleFrames;
  const accentColor = theme.accent !== theme.background ? theme.accent : '#4a9eff';

  // チャプター境界フェード
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

  // 現在フレームまでの timeline を走査して最後の HTML スライド PNG を特定
  let currentSlidePng: string | null = null;
  let slideStartFrame = 0;
  for (const entry of timeline) {
    if (entry.startFrame > frame) break;
    if (entry.line.audioFile) {
      const png = audioToSlide.get(entry.line.audioFile);
      if (png) {
        currentSlidePng = png;
        slideStartFrame = entry.startFrame;
      }
    }
  }

  // スライド切り替え直後のフェードイン
  const slideElapsed = frame - slideStartFrame;
  const slideOpacity = currentSlidePng
    ? interpolate(slideElapsed, [0, fps * 0.25], [0, 1], { extrapolateRight: 'clamp' })
    : 0;

  // section スライド: 各チャプター冒頭2秒間は sectionSlide を優先表示
  const SECTION_DURATION = Math.round(fps * 2);
  const currentChapterIndex = currentEntry?.chapterIndex ?? -1;
  const currentChapterStart = chapterMarkers[currentChapterIndex] ?? 0;
  const chapterElapsed = frame - currentChapterStart;
  const sectionSlidePng = (!showTitle && chapterElapsed < SECTION_DURATION)
    ? (chapterToSection.get(currentChapterIndex) ?? null)
    : null;
  // section表示中は section PNGを使い、それ以外は通常の audio-linked スライドを使う
  const displaySlidePng = sectionSlidePng ?? currentSlidePng;
  const displayOpacity = sectionSlidePng
    ? interpolate(chapterElapsed, [0, fps * 0.2], [0, 1], { extrapolateRight: 'clamp' })
    : slideOpacity;

  const charOpacity = 1;

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

      {/* タイトルカード */}
      {showTitle && (
        <>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 50%, rgba(0,0,0,0.65) 100%)',
            zIndex: 15,
          }} />
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
          <TitleAnimation
            title={scriptInput.title}
            style={variation.titleStyle}
            startFrame={0}
            color="#ffffff"
            fontSize={Math.floor(width * 0.055)}
          />
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

      {/* キャラクター */}
      {!showTitle && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 70, pointerEvents: 'none', opacity: charOpacity }}>
          <MetanStage
            emotion={currentLine?.speaker === 'ponchan' ? (currentLine.emotion ?? 'normal') : 'normal'}
            isSpeaking={currentLine?.speaker === 'ponchan'}
            startFrame={currentEntry?.startFrame ?? 0}
            position="left"
            height={Math.round(height * 0.42)}
            offsetX={50}
          />
          <ZundamonStage
            emotion={currentLine?.speaker === 'maro' ? (currentLine.emotion ?? 'normal') : 'normal'}
            isSpeaking={currentLine?.speaker === 'maro'}
            startFrame={currentEntry?.startFrame ?? 0}
            position="right"
            height={Math.round(height * 0.42)}
            offsetX={50}
          />
        </div>
      )}

      {/* HTML スライド PNG（VisualLayer の代わり）
           スライドは 1920×1080(16:9)。表示幅を width*0.82 に固定し、
           高さを 16:9 で算出することで歪み・見切れなしに表示
           sectionSlidePng が優先（chapterIndex冒頭2秒）、その後 audioToSlide の visual を表示 */}
      {!showTitle && displaySlidePng && (
        <div style={{
          position: 'absolute',
          top: '9%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: Math.round(width * 0.78),
          height: Math.round(width * 0.78 * 9 / 16),
          zIndex: 40,
          opacity: displayOpacity,
          borderRadius: 8,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
        }}>
          <Img
            src={staticFile(displaySlidePng)}
            style={{ width: '100%', height: '100%', objectFit: 'fill' }}
          />
        </div>
      )}

      {/* シネマティック演出 */}
      <CinematicLayer
        currentLine={currentLine}
        currentEntry={currentEntry}
        chapterType={currentChapter?.type ?? null}
      />

      {/* トピックバッジ */}
      {!showTitle && currentChapter?.topic && (() => {
        const ci = scriptInput.chapters.indexOf(currentChapter);
        const chapterStart = timeline.find(e => e.chapterIndex === ci)?.startFrame ?? fps * 2;
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

      {/* プログレスバー */}
      <ProgressBar
        totalFrames={totalFrames}
        color={theme.accent}
        chapterMarkers={chapterMarkers}
        position="bottom"
      />

      {/* チャプタートランジション */}
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

      {/* エンディング（本編終了後 20 秒の固定エンディング画面） */}
      <Sequence from={totalFrames} durationInFrames={endingFrames}>
        <EndingSequence />
      </Sequence>
    </div>
  );
};
