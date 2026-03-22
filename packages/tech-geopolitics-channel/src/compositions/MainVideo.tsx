import React from 'react';
import { useCurrentFrame, useVideoConfig, Audio, interpolate, spring, staticFile } from 'remotion';
import { ScriptInput, VariationConfig, Chapter, ScriptLine } from '../utils/types';
import { getVariation } from '../components/VariationEngine';
import { THEMES } from '../styles/themes';
import { ZundamonStage } from '../components/ZundamonStage';
import { MetanStage } from '../components/MetanStage';
import { DataChart } from '../components/DataChart';
import { KeywordFloat } from '../components/KeywordFloat';
import { ProgressBar } from '../components/ProgressBar';
import { TitleAnimation } from '../components/TitleAnimation';
import { BackgroundRenderer } from '../components/BackgroundRenderer';
import { SplitCompare } from '../components/SplitCompare';
import { TimelineScroll } from '../components/TimelineScroll';
import { ImageOverlay } from '../components/ImageOverlay';

export interface MainVideoProps {
  scriptInput: ScriptInput;
}

/** フレームオフセットを計算：チャプター・セリフの開始フレームを解決 */
function buildTimeline(scriptInput: ScriptInput, fps: number) {
  const timeline: {
    chapterIndex: number;
    lineIndex: number;
    line: ScriptLine;
    startFrame: number;
    endFrame: number;
  }[] = [];

  let cursor = fps * 2; // 冒頭2秒はタイトル表示

  scriptInput.chapters.forEach((chapter, ci) => {
    chapter.lines.forEach((line, li) => {
      const frameDuration = line.frameCount ?? Math.floor((line.audioDuration ?? 3) * fps) + 5;
      timeline.push({
        chapterIndex: ci,
        lineIndex: li,
        line,
        startFrame: cursor,
        endFrame: cursor + frameDuration,
      });
      cursor += frameDuration;
    });
  });

  return { timeline, totalFrames: cursor + fps * 2 }; // 末尾2秒
}

export const MainVideo: React.FC<MainVideoProps> = ({ scriptInput }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const variation: VariationConfig = getVariation(scriptInput.seed);
  const theme = THEMES[variation.theme];
  const { timeline, totalFrames } = buildTimeline(scriptInput, fps);

  // 現在フレームに対応するセリフを検索
  const currentEntry = timeline.find((e) => frame >= e.startFrame && frame < e.endFrame);
  const currentLine = currentEntry?.line;
  const currentChapter = currentLine ? scriptInput.chapters[currentEntry!.chapterIndex] : null;

  // チャプター区切りフレーム
  const chapterMarkers = scriptInput.chapters.reduce<number[]>((acc, _, ci) => {
    const firstEntry = timeline.find((e) => e.chapterIndex === ci);
    if (firstEntry) acc.push(firstEntry.startFrame);
    return acc;
  }, []);

  // ---- キャラクター配置 ----
  const renderCharacters = () => {
    const layout = variation.characterLayout;
    const isSpeakingZunda = currentLine?.speaker === 'zundamon';
    const isSpeakingMetan = currentLine?.speaker === 'metan';

    if (layout === 'left-right') {
      return (
        <>
          <MetanStage emotion={currentLine?.speaker === 'metan' ? currentLine.emotion : 'normal'}
            isSpeaking={isSpeakingMetan} startFrame={0} position="left" height={height * 0.38} />
          <ZundamonStage emotion={currentLine?.speaker === 'zundamon' ? currentLine.emotion : 'normal'}
            isSpeaking={isSpeakingZunda} startFrame={0} position="right" height={height * 0.38} />
        </>
      );
    }
    if (layout === 'bottom-center') {
      return (
        <>
          <MetanStage emotion={currentLine?.speaker === 'metan' ? currentLine.emotion : 'normal'}
            isSpeaking={isSpeakingMetan} startFrame={0} position="left" height={height * 0.35} />
          <ZundamonStage emotion={currentLine?.speaker === 'zundamon' ? currentLine.emotion : 'normal'}
            isSpeaking={isSpeakingZunda} startFrame={0} position="right" height={height * 0.35} />
        </>
      );
    }
    // その他のレイアウトも left-right で代替
    return (
      <>
        <MetanStage emotion={currentLine?.speaker === 'metan' ? currentLine.emotion : 'normal'}
          isSpeaking={isSpeakingMetan} startFrame={0} position="left" height={height * 0.38} />
        <ZundamonStage emotion={currentLine?.speaker === 'zundamon' ? currentLine.emotion : 'normal'}
          isSpeaking={isSpeakingZunda} startFrame={0} position="right" height={height * 0.38} />
      </>
    );
  };

  // ---- 字幕 ----
  const renderSubtitle = () => {
    if (!currentLine) return null;
    const localFrame = frame - (currentEntry?.startFrame ?? 0);
    const fadeIn = spring({ frame: localFrame, fps, config: { damping: 25, stiffness: 200 } });
    const speakerColor = currentLine.speaker === 'zundamon' ? '#228B22' : '#FF1493';

    return (
      <div style={{
        position: 'absolute',
        bottom: variation.subtitleStyle === 'cinematic' ? '15%' : '6%',
        left: '22%', right: '22%',
        textAlign: 'center',
        opacity: fadeIn,
        transform: `translateY(${interpolate(fadeIn, [0, 1], [20, 0])}px)`,
        zIndex: 50,
      }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: variation.subtitleStyle === 'bottom-bar'
            ? 'rgba(0,0,0,0.75)' : 'transparent',
          padding: '8px 24px',
          borderRadius: 8,
          borderLeft: variation.subtitleStyle === 'cinematic' ? `4px solid ${speakerColor}` : 'none',
        }}>
          <span style={{
            color: theme.text,
            fontSize: 36,
            fontWeight: 700,
            textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
          }}>
            {currentLine.text}
          </span>
        </div>
      </div>
    );
  };

  // ---- ビジュアル（チャート・キーワード） ----
  const renderVisuals = () => {
    if (!currentChapter || !currentChapter.visuals) return null;
    const chapterStartFrame = timeline.find((e) => e.chapterIndex === timeline.find(t => t.line === currentLine)?.chapterIndex)?.startFrame ?? 0;

    return currentChapter.visuals.map((visual, vi) => {
      const visualStart = chapterStartFrame + visual.at * fps;
      if (frame < visualStart) return null;

      if (visual.type === 'keyword' && visual.text) {
        return (
          <KeywordFloat key={vi}
            text={visual.text}
            startFrame={visualStart}
            endFrame={visualStart + fps * 4}
            x={50} y={30}
            color={theme.accent !== theme.background ? theme.accent : '#ffdd44'}
          />
        );
      }
      if (visual.type === 'chart' && visual.data) {
        const chartData = scriptInput.chartData[visual.data];
        if (!chartData) return null;
        return (
          <div key={vi} style={{
            position: 'absolute', top: '12%', right: '3%',
            opacity: interpolate(frame - visualStart, [0, 15], [0, 1], { extrapolateRight: 'clamp' }),
          }}>
            <DataChart
              type={visual.chartType ?? 'line'}
              data={chartData}
              title={visual.data}
              animationStyle="draw"
              width={480} height={280}
            />
          </div>
        );
      }
      if (visual.type === 'split' && visual.splitData) {
        return (
          <div key={vi} style={{
            position: 'absolute',
            top: '15%', left: '50%',
            transform: 'translateX(-50%)',
            width: width * 0.75,
            zIndex: 30,
          }}>
            <SplitCompare
              left={visual.splitData.left}
              right={visual.splitData.right}
              title={visual.splitData.title}
              startFrame={visualStart}
              width={width * 0.75}
              height={height * 0.38}
            />
          </div>
        );
      }
      if (visual.type === 'timeline' && visual.timelineData) {
        return (
          <div key={vi} style={{
            position: 'absolute',
            bottom: '18%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: width * 0.9,
            zIndex: 30,
          }}>
            <TimelineScroll
              events={visual.timelineData.events}
              title={visual.timelineData.title}
              startFrame={visualStart}
              scrollSpeed={visual.timelineData.scrollSpeed ?? 1.2}
              activeIndex={visual.timelineData.activeIndex}
              accentColor={theme.accent !== theme.background ? theme.accent : '#4a9eff'}
              textColor={theme.text}
              width={width * 0.9}
              height={height * 0.22}
            />
          </div>
        );
      }
      if (visual.type === 'image' && visual.imageData) {
        const imgDuration = visual.imageData.duration ?? 8;
        const visualEnd = Math.floor(visualStart + imgDuration * fps);
        if (frame > visualEnd) return null;
        return (
          <ImageOverlay
            key={vi}
            imageData={visual.imageData}
            startFrame={visualStart}
            endFrame={visualEnd}
            accentColor={theme.accent !== theme.background ? theme.accent : '#4a9eff'}
          />
        );
      }
      return null;
    });
  };

  // ---- 音声（セリフ） ----
  const renderAudio = () => {
    return timeline.map((entry, i) => {
      if (!entry.line.audioFile) return null;
      return (
        <Audio
          key={i}
          src={`/public/${entry.line.audioFile}`}
          startFrom={0}
          endAt={entry.line.frameCount}
          // Remotionでは AbsoluteFill 内の Audio は startFrom で絶対フレームを使う
        />
      );
    });
  };

  // ---- BGM ----
  const renderBgm = () => {
    if (!scriptInput.bgm) return null;
    const bgmVolume = scriptInput.bgmVolume ?? 0.12;
    const fadeFrames = fps * 2; // フェードイン/アウト: 2秒

    return (
      <Audio
        src={staticFile(scriptInput.bgm)}
        loop
        volume={(f) => {
          // フェードイン
          const fadeIn = Math.min(f / fadeFrames, 1);
          // フェードアウト（動画末尾）
          const fadeOut = Math.min((totalFrames - f) / fadeFrames, 1);
          return Math.min(fadeIn, fadeOut) * bgmVolume;
        }}
      />
    );
  };

  // タイトル表示（冒頭2秒）
  const showTitle = frame < fps * 2;

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden' }}>
      {/* BGM（ループ・フェードイン/アウト） */}
      {renderBgm()}

      {/* 背景 */}
      <BackgroundRenderer type={variation.background} theme={theme} />

      {/* タイトル（冒頭） */}
      {showTitle && (
        <TitleAnimation
          title={scriptInput.title}
          style={variation.titleStyle}
          startFrame={0}
          color={theme.text}
          fontSize={Math.floor(width * 0.04)}
        />
      )}

      {/* キャラクター */}
      {!showTitle && renderCharacters()}

      {/* ビジュアル */}
      {renderVisuals()}

      {/* 字幕 */}
      {!showTitle && renderSubtitle()}

      {/* プログレスバー */}
      <ProgressBar
        totalFrames={totalFrames}
        color={theme.accent}
        chapterMarkers={chapterMarkers}
        position="bottom"
      />
    </div>
  );
};

export default MainVideo;
