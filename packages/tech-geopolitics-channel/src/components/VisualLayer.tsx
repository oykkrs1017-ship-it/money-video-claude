/**
 * VisualLayer.tsx
 * ビジュアル描画レイヤー。新形式（ScriptLine.visual）と旧形式（chapter.visuals）の両方に対応。
 *
 * 優先順位:
 *   1. currentLine.visual が存在 → 新形式（行単位）でレンダリング
 *   2. chapter.visuals が存在   → 旧形式（チャプター単位 + at: オフセット）でレンダリング
 *   3. どちらもなし、かつ同チャプターに前ビジュアルあり → 持続表示（前行のビジュアルをそのまま維持）
 *   4. 同チャプターにビジュアルが一切なし → null（背景＋キャラクターのみ）
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import {
  Chapter, ScriptLine, ScriptInput, TimelineEntry,
  Visual, VisualLegacy,
  ImageData, StatCardData, SlideCardData,
} from '../utils/types';
import { ThemeColors } from '../styles/themes';
import { DataChart } from './DataChart';
import { KeywordFloat } from './KeywordFloat';
import { SplitCompare } from './SplitCompare';
import { TimelineScroll } from './TimelineScroll';
import { ImageOverlay } from './ImageOverlay';
import { StatCard } from './StatCard';
import { SlideCard } from './SlideCard';
import { RichPanel } from './RichPanel';
import { ComparisonTable } from './ComparisonTable';
import { FlowChart } from './FlowChart';
import { TrafficLight } from './TrafficLight';
import { CycleLoop } from './CycleLoop';
import { ScaleBalance } from './ScaleBalance';
import { IsometricStack } from './IsometricStack';
import { GraphCatalogPanel } from './GraphCatalogPanel';
import { ZLayoutDiagram } from './ZLayoutDiagram';
import { NumberContextCard } from './NumberContextCard';
import { FactInsightCompare } from './FactInsightCompare';
import { AudienceTable } from './AudienceTable';

// ─── キーワード抽出（フォールバックスライド用） ───────────────────────────

function extractKeywords(text: string): string[] {
  const numbers = text.match(/[\d,.]+[%億兆万円ドル日年月個本基倍以上以下超割]/g) ?? [];
  const katakana = text.match(/[ァ-ヶー]{3,}/g) ?? [];
  const english = text.match(/[A-Z][A-Z0-9]{1,}/g) ?? [];
  const quoted = text.match(/「([^」]{2,12})」/g)?.map((s) => s.replace(/「|」/g, '')) ?? [];
  return [...new Set([...quoted, ...numbers, ...english, ...katakana])].slice(0, 3);
}

// ─── Props ────────────────────────────────────────────────────────────────

interface VisualLayerProps {
  currentChapter: Chapter | null;
  currentLine: ScriptLine | null | undefined;
  currentEntry: TimelineEntry | null | undefined;
  timeline: TimelineEntry[];
  scriptInput: ScriptInput;
  theme: ThemeColors;
  showTitle: boolean;
  width: number;
  height: number;
}

// ─── コンポーネント ─────────────────────────────────────────────────────

export const VisualLayer: React.FC<VisualLayerProps> = ({
  currentChapter,
  currentLine,
  currentEntry,
  timeline,
  scriptInput,
  theme,
  showTitle,
  width,
  height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!currentChapter || !currentEntry) return null;

  const accentColor = theme.accent !== theme.background ? theme.accent : '#4a9eff';

  // ── フォールバックスライド生成ヘルパー ──────────────────────────────
  const renderFallbackSlide = (key: string) => {
    if (!currentLine) return null;
    const kws = extractKeywords(currentLine.text);
    const chapterTitle = currentChapter.topic ?? currentChapter.type;

    const slideData: SlideCardData = kws.length >= 2
      ? { layout: 'bullets', title: chapterTitle, bullets: kws }
      : {
          layout: 'highlight',
          title: chapterTitle,
          highlight: kws[0] ?? currentLine.text.slice(0, 16),
          subtext: kws.length === 0 ? currentLine.text.slice(0, 30) : undefined,
        };

    return (
      <SlideCard
        key={key}
        data={slideData}
        startFrame={currentEntry.startFrame}
        endFrame={currentEntry.endFrame}
        accentColor={accentColor}
        width={Math.round(width * 0.88)}
      />
    );
  };

  const chapterIndex = timeline.find((t) => t.line === currentLine)?.chapterIndex ?? 0;
  const chapterStartFrame = timeline.find((e) => e.chapterIndex === chapterIndex)?.startFrame ?? 0;
  const chapterEndFrame = [...timeline]
    .filter((e) => e.chapterIndex === chapterIndex)
    .reduce((max, e) => Math.max(max, e.endFrame), chapterStartFrame);

  // ══════════════════════════════════════════════════════════════════════
  // チャプターレベル image（インフォグラフィック）: 指定時間内は最優先表示
  // ══════════════════════════════════════════════════════════════════════

  const chapterImageVisual = (currentChapter?.visuals ?? []).find(
    (v) => v.type === 'image' && v.imageData
  );
  if (chapterImageVisual?.imageData) {
    const imgStart = chapterStartFrame + (chapterImageVisual.at ?? 0) * fps;
    const imgEnd   = Math.floor(imgStart + (chapterImageVisual.imageData.duration ?? 8) * fps);
    if (frame >= imgStart && frame < imgEnd) {
      // キャラクター（下部38%）と被らないようにwidth/positionを自動補正
      const safeWidth = Math.min(chapterImageVisual.imageData.width ?? 1680, 1700);
      const optimizedImageData = {
        ...chapterImageVisual.imageData,
        width: safeWidth,
        position: 'top-center' as const,
        animation: 'fade' as const, // インフォグラフィックはKen Burns/スライド無効
      };
      return (
        <ImageOverlay
          imageData={optimizedImageData}
          startFrame={imgStart}
          endFrame={imgEnd}
          accentColor={accentColor}
        />
      );
    }
  }

  // ══════════════════════════════════════════════════════════════════════
  // 新形式: ScriptLine.visual（行単位）
  // ══════════════════════════════════════════════════════════════════════

  const lineVisual: Visual | undefined = currentLine?.visual;

  if (lineVisual) {
    return renderNewVisual(lineVisual, currentEntry.startFrame, currentEntry.endFrame);
  }

  // ══════════════════════════════════════════════════════════════════════
  // 旧形式: chapter.visuals（後方互換）
  // ══════════════════════════════════════════════════════════════════════

  const legacyVisuals: VisualLegacy[] = [...(currentChapter.visuals ?? [])].sort(
    (a, b) => a.at - b.at
  );

  if (legacyVisuals.length > 0) {
    return renderLegacyVisuals(legacyVisuals, chapterStartFrame, chapterEndFrame);
  }

  // ══════════════════════════════════════════════════════════════════════
  // show: なし → 同チャプターの直前ビジュアルを持続表示
  // keyword / highlight は一瞬系なので持続対象外
  // ══════════════════════════════════════════════════════════════════════

  if (!showTitle) {
    const persistable = (v: Visual) =>
      v.type !== 'keyword' && v.type !== 'highlight';

    const prevEntry = [...timeline]
      .filter(
        (e) =>
          e.chapterIndex === chapterIndex &&
          e.endFrame <= currentEntry.startFrame &&
          e.line.visual != null &&
          persistable(e.line.visual)
      )
      .at(-1); // 直近の1件

    if (prevEntry?.line.visual) {
      // アニメーションは既に完了した startFrame を使い回すので
      // フェードイン不要・現行 endFrame まで維持するだけ
      return renderNewVisual(
        prevEntry.line.visual,
        prevEntry.startFrame,
        currentEntry.endFrame,
        true, // persisted = フェードイン/アウトなし
      );
    }
  }

  return null;

  // ────────────────────────────────────────────────────────────────────
  // 新形式レンダラー
  // ────────────────────────────────────────────────────────────────────

  function renderNewVisual(
    visual: Visual,
    startFrame: number,
    endFrame: number,
    persisted = false,
  ) {
    // 持続表示（前行のビジュアルを引き継ぎ）の場合はフェード不要で常に不透明
    const fadeIn  = persisted ? 1 : interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
    const fadeOut = persisted ? 1 : interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
    const opacity = Math.min(fadeIn, fadeOut);

    if (visual.type === 'keyword') {
      return (
        <KeywordFloat
          text={visual.text}
          startFrame={startFrame}
          endFrame={Math.min(startFrame + fps * 4, endFrame)}
          x={50} y={30}
          color="#ffffff"
        />
      );
    }

    if (visual.type === 'highlight') {
      return (
        <KeywordFloat
          text={visual.text}
          startFrame={startFrame}
          endFrame={Math.min(startFrame + fps * 5, endFrame)}
          x={50} y={35}
          color="#ffdd44"
        />
      );
    }

    if (visual.type === 'chart') {
      const rawChartData = scriptInput.chartData[visual.key];
      if (!rawChartData) return renderFallbackSlide(`no-chart-${visual.key}`);
      const chartPoints = Array.isArray(rawChartData) ? rawChartData : rawChartData.data;
      const chartDataSet = Array.isArray(rawChartData) ? null : rawChartData;
      const chartW = Math.round(width * 0.88);
      const chartH = Math.min(Math.round(chartW * 0.44), Math.round(height * 0.52));
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)', zIndex: 40, opacity,
        }}>
          <DataChart
            type={visual.chartType ?? chartDataSet?.chartType ?? 'line'}
            data={chartPoints}
            title={visual.title ?? chartDataSet?.title ?? visual.key}
            animationStyle="draw"
            width={chartW} height={chartH}
          />
        </div>
      );
    }

    if (visual.type === 'stat') {
      const statData: StatCardData = {
        value: visual.value,
        label: visual.label,
        subtext: visual.subtext,
        metrics: visual.metrics,
      };
      return (
        <StatCard
          data={statData}
          startFrame={startFrame}
          endFrame={endFrame}
          accentColor={accentColor}
          width={Math.round(width * 0.54)}
        />
      );
    }

    if (visual.type === 'slide') {
      const slideData: SlideCardData = {
        layout:      visual.layout,
        title:       visual.title,
        bullets:     visual.bullets,
        highlight:   visual.highlight,
        subtext:     visual.subtext,
        quote:       visual.quote,
        attribution: visual.attribution,
        numbers:     visual.numbers,
        left:        visual.left,
        right:       visual.right,
        color:       visual.color,
      };
      return (
        <SlideCard
          data={slideData}
          startFrame={startFrame}
          endFrame={endFrame}
          accentColor={accentColor}
          width={Math.round(width * 0.88)}
        />
      );
    }

    if (visual.type === 'rich-panel') {
      return (
        <RichPanel
          number={visual.number}
          title={visual.title}
          icon={visual.icon}
          body={visual.body}
          emphasis={visual.emphasis}
          points={visual.points}
          color={visual.color}
          accentColor={accentColor}
          startFrame={startFrame}
          endFrame={endFrame}
          width={Math.round(width * 0.92)}
          fillContainer={height > 1200}
        />
      );
    }

    if (visual.type === 'image') {
      const imgDuration = visual.duration ?? 8;
      const imgEnd = Math.min(Math.floor(startFrame + imgDuration * fps), endFrame);
      if (frame > imgEnd) return null;
      // Shorts（縦型）ではコンテナ幅（動画幅×0.90）に収めてタイトル見切れを防ぐ
      const maxImgWidth = height > 1200
        ? Math.round(width * 0.90)
        : (visual.width ?? 1280);
      const imageData: ImageData = {
        src:       visual.src ?? '',
        url:       visual.url,
        caption:   visual.caption,
        position:  visual.position,
        width:     Math.min(visual.width ?? 1280, maxImgWidth),
        duration:  visual.duration,
        animation: visual.animation,
      };
      return (
        <ImageOverlay
          imageData={imageData}
          startFrame={startFrame}
          endFrame={imgEnd}
          accentColor={accentColor}
        />
      );
    }

    if (visual.type === 'timeline') {
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)', width: width * 0.92, zIndex: 30, opacity,
        }}>
          <TimelineScroll
            events={visual.events}
            title={visual.title}
            startFrame={startFrame}
            scrollSpeed={visual.scrollSpeed ?? 1.2}
            activeIndex={visual.activeIndex}
            accentColor={accentColor}
            textColor={theme.text}
            width={width * 0.92}
            height={height * 0.52}
          />
        </div>
      );
    }

    if (visual.type === 'split') {
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)', width: width * 0.88, zIndex: 30, opacity,
        }}>
          <SplitCompare
            left={visual.left as any}
            right={visual.right as any}
            title={visual.title}
            startFrame={startFrame}
            width={width * 0.88}
            height={height * 0.50}
          />
        </div>
      );
    }

    if (visual.type === 'ai-infographic') {
      const imgDuration = visual.duration ?? 6;
      const imgEnd = Math.min(Math.floor(startFrame + imgDuration * fps), endFrame);
      if (frame > imgEnd) return null;
      const imageData: ImageData = {
        src:      `images/${visual.key}.png`,
        caption:  visual.caption,
        position: visual.position,
        duration: visual.duration,
        animation: 'fade',
      };
      return (
        <ImageOverlay
          imageData={imageData}
          startFrame={startFrame}
          endFrame={imgEnd}
          accentColor={accentColor}
        />
      );
    }

    if (visual.type === 'graph-catalog') {
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)',
          width: Math.round(width * 0.88),
          zIndex: 35, opacity,
        }}>
          <GraphCatalogPanel
            title={visual.title}
            subtitle={visual.subtitle}
            sections={visual.sections}
            tips={visual.tips}
            decisions={visual.decisions}
            startFrame={startFrame}
            endFrame={endFrame}
            width={Math.round(width * 0.88)}
          />
        </div>
      );
    }

    if (visual.type === 'z-layout') {
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)',
          width: Math.round(width * 0.88),
          zIndex: 35, opacity,
        }}>
          <ZLayoutDiagram
            title={visual.title}
            rules={visual.rules}
            diagramLabels={visual.diagramLabels}
            startFrame={startFrame}
            endFrame={endFrame}
            width={Math.round(width * 0.88)}
          />
        </div>
      );
    }

    if (visual.type === 'number-context') {
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)',
          width: Math.round(width * 0.88),
          zIndex: 35, opacity,
        }}>
          <NumberContextCard
            title={visual.title}
            before={visual.before}
            after={visual.after}
            startFrame={startFrame}
            endFrame={endFrame}
            width={Math.round(width * 0.88)}
          />
        </div>
      );
    }

    if (visual.type === 'fact-insight') {
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)',
          width: Math.round(width * 0.88),
          zIndex: 35, opacity,
        }}>
          <FactInsightCompare
            title={visual.title}
            bad={visual.bad}
            good={visual.good}
            tip={visual.tip}
            startFrame={startFrame}
            endFrame={endFrame}
            width={Math.round(width * 0.88)}
          />
        </div>
      );
    }

    if (visual.type === 'audience-table') {
      return (
        <div style={{
          position: 'absolute', top: '8%', left: '50%',
          transform: 'translateX(-50%)',
          width: Math.round(width * 0.88),
          zIndex: 35, opacity,
        }}>
          <AudienceTable
            title={visual.title}
            rows={visual.rows}
            startFrame={startFrame}
            endFrame={endFrame}
            width={Math.round(width * 0.88)}
          />
        </div>
      );
    }

    const vizW  = Math.round(width  * 0.90);
    const vizH  = Math.round(height * 0.54);
    const vizWrapStyle: React.CSSProperties = {
      position: 'absolute', top: '8%', left: '50%',
      transform: 'translateX(-50%)',
      width: vizW, height: vizH,
      zIndex: 35, opacity,
    };

    if (visual.type === 'comparison-table') {
      return (
        <div style={vizWrapStyle}>
          <ComparisonTable
            title={visual.title}
            columns={visual.columns}
            rows={visual.rows}
            badge={visual.badge}
            footer={visual.footer}
            startFrame={startFrame}
            endFrame={endFrame}
            accentColor={accentColor}
            width={vizW}
            height={vizH}
          />
        </div>
      );
    }

    if (visual.type === 'flow-chart') {
      return (
        <div style={vizWrapStyle}>
          <FlowChart
            title={visual.title}
            root={visual.root}
            footer={visual.footer}
            startFrame={startFrame}
            endFrame={endFrame}
            accentColor={accentColor}
            width={vizW}
            height={vizH}
          />
        </div>
      );
    }

    if (visual.type === 'traffic-light') {
      return (
        <div style={vizWrapStyle}>
          <TrafficLight
            title={visual.title}
            items={visual.items}
            footer={visual.footer}
            startFrame={startFrame}
            endFrame={endFrame}
            accentColor={accentColor}
            width={vizW}
            height={vizH}
          />
        </div>
      );
    }

    if (visual.type === 'cycle-loop') {
      return (
        <div style={vizWrapStyle}>
          <CycleLoop
            title={visual.title}
            steps={visual.steps}
            centerText={visual.centerText}
            footer={visual.footer}
            startFrame={startFrame}
            endFrame={endFrame}
            accentColor={accentColor}
            width={vizW}
            height={vizH}
          />
        </div>
      );
    }

    if (visual.type === 'scale-balance') {
      return (
        <div style={vizWrapStyle}>
          <ScaleBalance
            title={visual.title}
            left={visual.left}
            right={visual.right}
            footer={visual.footer}
            startFrame={startFrame}
            endFrame={endFrame}
            accentColor={accentColor}
            width={vizW}
            height={vizH}
          />
        </div>
      );
    }

    if (visual.type === 'isometric-stack') {
      return (
        <div style={vizWrapStyle}>
          <IsometricStack
            title={visual.title}
            layers={visual.layers}
            corners={visual.corners}
            topLabel={visual.topLabel}
            startFrame={startFrame}
            endFrame={endFrame}
            accentColor={accentColor}
            width={vizW}
            height={vizH}
          />
        </div>
      );
    }

    return null;
  }

  // ────────────────────────────────────────────────────────────────────
  // 旧形式レンダラー（後方互換・chapter.visuals）
  // ────────────────────────────────────────────────────────────────────

  function renderLegacyVisuals(
    visuals: VisualLegacy[],
    chapterStart: number,
    chapterEnd: number,
  ) {
    // 最初のビジュアルが始まる前はフォールバック
    const firstVisualFrame = chapterStart + visuals[0]!.at * fps;
    if (frame < firstVisualFrame && !showTitle) {
      return renderFallbackSlide(`fallback-before-${currentEntry!.startFrame}`);
    }

    const hasActiveVisual = visuals.some((visual, vi) => {
      const vStart = chapterStart + visual.at * fps;
      const nextV  = visuals[vi + 1];
      const vEnd   = nextV ? chapterStart + nextV.at * fps : chapterEnd;
      if (visual.type === 'keyword') {
        if (!visual.text) return false;
        return frame >= vStart && frame < Math.min(vStart + fps * 4, vEnd);
      }
      return frame >= vStart && frame < vEnd;
    });

    return (
      <>
        {!hasActiveVisual && renderFallbackSlide(`fallback-gap-${currentEntry!.startFrame}`)}
        {visuals.map((visual, vi) => {
          const visualStart = chapterStart + visual.at * fps;
          if (frame < visualStart) return null;

          const nextVisual     = visuals[vi + 1];
          const nextVisualStart = nextVisual ? chapterStart + nextVisual.at * fps : chapterEnd;
          const autoEnd        = nextVisualStart;

          if (visual.type === 'keyword' && visual.text) {
            return (
              <KeywordFloat key={vi}
                text={visual.text}
                startFrame={visualStart}
                endFrame={Math.min(visualStart + fps * 4, autoEnd)}
                x={50} y={30}
                color="#ffffff"
              />
            );
          }

          if (visual.type === 'chart' && visual.data) {
            if (frame > autoEnd) return null;
            const rawChartData = scriptInput.chartData[visual.data];
            if (!rawChartData) return null;
            const chartPoints  = Array.isArray(rawChartData) ? rawChartData : rawChartData.data;
            const chartDataSet = Array.isArray(rawChartData) ? null : rawChartData;
            const chartW = Math.round(width * 0.88);
            const chartH = Math.min(Math.round(chartW * 0.44), Math.round(height * 0.52));
            const fadeIn  = interpolate(frame - visualStart, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
            const fadeOut = interpolate(frame, [autoEnd - fps * 0.5, autoEnd], [1, 0], {
              extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
            });
            return (
              <div key={vi} style={{
                position: 'absolute', top: '8%', left: '50%',
                transform: 'translateX(-50%)', zIndex: 40,
                opacity: Math.min(fadeIn, fadeOut),
              }}>
                <DataChart
                  type={visual.chartType ?? chartDataSet?.chartType ?? 'line'}
                  data={chartPoints}
                  title={chartDataSet?.title ?? visual.data}
                  animationStyle="draw"
                  width={chartW} height={chartH}
                />
              </div>
            );
          }

          if (visual.type === 'stat' && visual.statData) {
            return (
              <StatCard key={vi}
                data={visual.statData}
                startFrame={visualStart}
                endFrame={visualStart + fps * 10}
                accentColor={accentColor}
                width={Math.round(width * 0.54)}
              />
            );
          }

          if (visual.type === 'slide' && visual.slideData) {
            return (
              <SlideCard key={vi}
                data={visual.slideData}
                startFrame={visualStart}
                endFrame={autoEnd}
                accentColor={accentColor}
                width={Math.round(width * 0.88)}
              />
            );
          }

          if (visual.type === 'split' && visual.splitData) {
            if (frame > autoEnd) return null;
            return (
              <div key={vi} style={{
                position: 'absolute', top: '8%', left: '50%',
                transform: 'translateX(-50%)', width: width * 0.88, zIndex: 30,
              }}>
                <SplitCompare
                  left={visual.splitData.left}
                  right={visual.splitData.right}
                  title={visual.splitData.title}
                  startFrame={visualStart}
                  width={width * 0.88}
                  height={height * 0.50}
                />
              </div>
            );
          }

          if (visual.type === 'timeline' && visual.timelineData) {
            if (frame > autoEnd) return null;
            return (
              <div key={vi} style={{
                position: 'absolute', top: '8%', left: '50%',
                transform: 'translateX(-50%)', width: width * 0.92, zIndex: 30,
              }}>
                <TimelineScroll
                  events={visual.timelineData.events}
                  title={visual.timelineData.title}
                  startFrame={visualStart}
                  scrollSpeed={visual.timelineData.scrollSpeed ?? 1.2}
                  activeIndex={visual.timelineData.activeIndex}
                  accentColor={accentColor}
                  textColor={theme.text}
                  width={width * 0.92}
                  height={height * 0.52}
                />
              </div>
            );
          }

          if (visual.type === 'image' && visual.imageData) {
            const imgDuration = visual.imageData.duration ?? 8;
            const visualEnd   = Math.floor(visualStart + imgDuration * fps);
            if (frame > visualEnd) return null;
            return (
              <ImageOverlay key={vi}
                imageData={visual.imageData}
                startFrame={visualStart}
                endFrame={visualEnd}
                accentColor={accentColor}
              />
            );
          }

          return null;
        })}
      </>
    );
  }
};

export default VisualLayer;
