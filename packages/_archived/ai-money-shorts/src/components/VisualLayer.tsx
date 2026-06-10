/**
 * VisualLayer.tsx
 * ショート動画（1080x1920）向けビジュアル描画レイヤー。
 *
 * discriminated union で各ビジュアルタイプを型安全に処理する。
 * 優先順位:
 *   1. currentSection.visuals の最初のビジュアルをレンダリング
 *   2. ビジュアルがない → null（キャラクター＋字幕のみ）
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, staticFile } from 'remotion';
import type {
  VisualElement,
  Section,
  GraphDataPoint,
} from '../types/episode';
import { AnimatedGraph } from './AnimatedGraph';
import { Z } from '../styles/zIndex';
import { SETTINGS } from '../settings.generated';

const { width, height } = SETTINGS.video;
// ビジュアルエリア: YouTube Shorts セーフティゾーン準拠
// 上端: safeZone.top(205px)、下端: キャラクター上端付近まで
const SAFE_TOP      = SETTINGS.safeZone.top;   // 205px
const SAFE_LEFT     = SETTINGS.safeZone.left;  // 50px
const VISUAL_TOP    = SAFE_TOP;
const VISUAL_HEIGHT = Math.round(height * 0.58); // 1113px → 上端205+1113=1318px（セーフゾーン下端1527px以内）
const VISUAL_WIDTH  = Math.round(width - SAFE_LEFT * 2); // 980px（左右50px確保）

// ── フォールバックキーワード抽出 ─────────────────────────────────────

function extractKeywords(text: string): string[] {
  const numbers  = text.match(/[\d,.]+[%億兆万円ドル日年月個本基倍以上以下超割]/g) ?? [];
  const katakana = text.match(/[ァ-ヶー]{3,}/g) ?? [];
  const english  = text.match(/[A-Z][A-Z0-9]{1,}/g) ?? [];
  const quoted   = text.match(/「([^」]{2,12})」/g)?.map((s) => s.replace(/「|」/g, '')) ?? [];
  return [...new Set([...quoted, ...numbers, ...english, ...katakana])].slice(0, 3);
}

// ── Props ─────────────────────────────────────────────────────────────

interface VisualLayerProps {
  currentSection: Section | null;
  startFrame: number;
  endFrame: number;
  accentColor?: string;
}

// ── コンポーネント ────────────────────────────────────────────────────

export const VisualLayer: React.FC<VisualLayerProps> = ({
  currentSection,
  startFrame,
  endFrame,
  accentColor = '#FFD700',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!currentSection || currentSection.visuals.length === 0) return null;

  // セクションの最初のビジュアルを描画
  const visual: VisualElement = currentSection.visuals[0];

  // フェードイン / フェードアウト
  // fadeOutはセクション終了後のトランジション期間（15F）も含めて次セクション開始まで維持
  const TRANSITION = 15; // TRANSITION_FRAMESと同値
  const fadeIn  = interpolate(frame - startFrame, [0, fps * 0.4], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame + TRANSITION - fps * 0.4, endFrame + TRANSITION], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  // versus-card は上詰め（縦積みで高さをフルに使う）、他は垂直中央
  const alignItems = visual.type === 'versus-card' ? 'flex-start' : 'center';

  return (
    <div
      style={{
        position: 'absolute',
        top: VISUAL_TOP,
        left: '50%',
        transform: 'translateX(-50%)',
        width: VISUAL_WIDTH,
        height: VISUAL_HEIGHT,
        zIndex: Z.VISUAL_LAYER,
        display: 'flex',
        alignItems,
        justifyContent: 'center',
        opacity,
      }}
    >
      {renderVisual(visual, startFrame, endFrame, fps, accentColor, frame)}
    </div>
  );
};

// ── ビジュアルレンダラー ──────────────────────────────────────────────

function renderVisual(
  visual: VisualElement,
  startFrame: number,
  endFrame: number,
  fps: number,
  accentColor: string,
  frame: number,
): React.ReactNode {
  switch (visual.type) {
    case 'telop':
      return <TelopVisual visual={visual} startFrame={startFrame} accentColor={accentColor} />;

    case 'graph':
      return (
        <AnimatedGraph
          graphType={visual.graphType}
          data={visual.graphData as GraphDataPoint[]}
          title={visual.title}
          startFrame={startFrame}
          animationDuration={Math.round(fps * 1.5)}
        />
      );

    case 'image':
      return <ImageVisual visual={visual} startFrame={startFrame} fps={fps} frame={frame} />;

    case 'data-card':
      return <DataCardVisual visual={visual} accentColor={accentColor} />;

    case 'quiz-choice':
      return (
        <QuizChoiceVisual
          visual={visual}
          startFrame={startFrame}
          endFrame={endFrame}
          fps={fps}
          frame={frame}
          accentColor={accentColor}
        />
      );

    case 'ranking-item':
      return <RankingItemVisual visual={visual} accentColor={accentColor} />;

    case 'rich-panel':
      return <RichPanelVisual visual={visual} accentColor={accentColor} />;

    case 'stat':
      return <StatVisual visual={visual} accentColor={accentColor} />;

    case 'multi-stat':
      return <MultiStatVisual visual={visual} accentColor={accentColor} />;

    case 'versus-card':
      return <VersusCardVisual visual={visual} frame={frame} startFrame={startFrame} />;

    case 'step-flow':
      return <StepFlowVisual visual={visual} accentColor={accentColor} startFrame={startFrame} frame={frame} />;

    case 'timeline':
      return <TimelineVisual visual={visual} accentColor={accentColor} startFrame={startFrame} fps={fps} frame={frame} />;

    case 'flow-chart':
      return <FlowChartVisual visual={visual} accentColor={accentColor} startFrame={startFrame} frame={frame} />;

    case 'infographic':
      return <InfographicVisual visual={visual} accentColor={accentColor} startFrame={startFrame} frame={frame} fps={fps} />;

    default:
      return null;
  }
}

// ── 各ビジュアルタイプコンポーネント ─────────────────────────────────

import type {
  TelopVisual as TelopType,
  ImageVisual as ImageType,
  DataCardVisual as DataCardType,
  QuizChoiceVisual as QuizChoiceType,
  RankingItemVisual as RankingItemType,
  RichPanelVisual as RichPanelType,
  StatVisual as StatType,
  MultiStatVisual as MultiStatType,
  VersusCardVisual as VersusCardType,
  StepFlowVisual as StepFlowType,
  TimelineVisual as TimelineType,
  FlowChartVisual as FlowChartType,
  InfographicVisual as InfographicType,
} from '../types/episode';

// テロップ
function TelopVisual({
  visual,
  startFrame,
  accentColor,
}: {
  visual: TelopType;
  startFrame: number;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const translateY = interpolate(progress, [0, 1], [30, 0]);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, rgba(10,14,39,0.92) 0%, rgba(26,31,58,0.92) 100%)`,
        border: `3px solid ${accentColor}`,
        borderRadius: 20,
        padding: '32px 40px',
        width: '100%',
        transform: `translateY(${translateY}px)`,
        opacity: progress,
      }}
    >
      <p
        style={{
          color: '#fff',
          fontSize: 46,
          fontWeight: '700',
          textAlign: 'center',
          margin: 0,
          lineHeight: 1.5,
          fontFamily: 'Noto Sans JP, sans-serif',
        }}
      >
        {visual.content}
      </p>
    </div>
  );
}

// 画像
function ImageVisual({
  visual,
  startFrame,
  fps,
  frame,
}: {
  visual: ImageType;
  startFrame: number;
  fps: number;
  frame: number;
}) {
  const progress = interpolate(frame - startFrame, [0, fps * 0.5], [0, 1], {
    extrapolateRight: 'clamp',
  });
  // ケン・バーンズ効果（わずかなズームイン）
  const scale = interpolate(frame - startFrame, [0, fps * 10], [1.02, 1.08], {
    extrapolateRight: 'clamp',
  });

  return (
    <div
      style={{
        width: '100%',
        height: VISUAL_HEIGHT - 80,
        borderRadius: 20,
        overflow: 'hidden',
        opacity: progress,
      }}
    >
      <img
        src={staticFile(visual.imagePath)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
        }}
        alt=""
      />
      {visual.caption && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            background: 'rgba(0,0,0,0.6)',
            borderRadius: 8,
            padding: '6px 12px',
            color: '#fff',
            fontSize: 28,
            textAlign: 'center',
          }}
        >
          {visual.caption}
        </div>
      )}
    </div>
  );
}

// データカード
function DataCardVisual({
  visual,
  accentColor,
}: {
  visual: DataCardType;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(progress, [0, 1], [0.8, 1]);

  return (
    <div
      style={{
        background: `linear-gradient(135deg, rgba(10,14,39,0.95) 0%, rgba(26,31,58,0.95) 100%)`,
        border: `4px solid ${accentColor}`,
        borderRadius: 24,
        padding: '48px 52px',
        textAlign: 'center',
        transform: `scale(${scale})`,
        opacity: progress,
        width: '90%',
      }}
    >
      <div
        style={{
          fontSize: 32,
          color: '#B0B8D1',
          fontFamily: 'Noto Sans JP, sans-serif',
          marginBottom: 12,
        }}
      >
        {visual.label}
      </div>
      <div
        style={{
          fontSize: 96,
          fontWeight: '900',
          color: accentColor,
          fontFamily: 'Montserrat, sans-serif',
          lineHeight: 1,
          marginBottom: 8,
        }}
      >
        {visual.value}
        {visual.unit && (
          <span style={{ fontSize: 48, marginLeft: 8 }}>{visual.unit}</span>
        )}
      </div>
      {visual.subtext && (
        <div style={{ fontSize: 30, color: '#B0B8D1', marginTop: 12 }}>
          {visual.subtext}
        </div>
      )}
    </div>
  );
}

// クイズ選択肢
function QuizChoiceVisual({
  visual,
  startFrame,
  endFrame,
  fps,
  frame,
  accentColor,
}: {
  visual: QuizChoiceType;
  startFrame: number;
  endFrame: number;
  fps: number;
  frame: number;
  accentColor: string;
}) {
  // 動画後半で正解をハイライト
  const revealFrame = startFrame + Math.round((endFrame - startFrame) * 0.6);
  const revealed = frame >= revealFrame;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {visual.question && (
        <div
          style={{
            color: '#fff',
            fontSize: 40,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 8,
            padding: '0 16px',
          }}
        >
          {visual.question}
        </div>
      )}
      {visual.choices.map((choice, i) => {
        const isCorrect = i === visual.correctIndex;
        const showCorrect = revealed && isCorrect;
        const showWrong = revealed && !isCorrect;
        const slideIn = interpolate(
          frame - startFrame - i * 6,
          [0, 15],
          [-80, 0],
          { extrapolateRight: 'clamp', extrapolateLeft: 'clamp' }
        );

        return (
          <div
            key={i}
            style={{
              background: showCorrect
                ? `linear-gradient(90deg, ${accentColor}33, ${accentColor}22)`
                : showWrong
                ? 'rgba(255,255,255,0.04)'
                : 'rgba(255,255,255,0.08)',
              border: `2px solid ${showCorrect ? accentColor : showWrong ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)'}`,
              borderRadius: 16,
              padding: '24px 32px',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              transform: `translateX(${slideIn}px)`,
              opacity: showWrong ? 0.45 : 1,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                background: showCorrect ? accentColor : 'rgba(255,255,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: showCorrect ? '#000' : '#fff',
                fontWeight: '900',
                fontSize: 28,
                flexShrink: 0,
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>
            <span style={{ color: '#fff', fontSize: 36, fontWeight: '600', flex: 1 }}>
              {choice}
            </span>
            {showCorrect && (
              <span style={{ fontSize: 40, flexShrink: 0 }}>✓</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ランキングアイテム
function RankingItemVisual({
  visual,
  accentColor,
}: {
  visual: RankingItemType;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: 'clamp' });
  const translateX = interpolate(progress, [0, 1], [-60, 0]);

  const rankColors: Record<number, string> = { 1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32' };
  const rankColor = rankColors[visual.rank] ?? accentColor;

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: `3px solid ${rankColor}`,
        borderRadius: 20,
        padding: '32px 40px',
        display: 'flex',
        alignItems: 'center',
        gap: 28,
        width: '92%',
        transform: `translateX(${translateX}px)`,
        opacity: progress,
      }}
    >
      <div
        style={{
          fontSize: 80,
          fontWeight: '900',
          color: rankColor,
          fontFamily: 'Montserrat, sans-serif',
          lineHeight: 1,
          minWidth: 80,
          textAlign: 'center',
        }}
      >
        {visual.rank}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ color: '#fff', fontSize: 44, fontWeight: '700' }}>{visual.label}</div>
        {visual.value && (
          <div style={{ color: rankColor, fontSize: 36, fontWeight: '600', marginTop: 8 }}>
            {visual.value}
          </div>
        )}
        {visual.description && (
          <div style={{ color: '#B0B8D1', fontSize: 30, marginTop: 6 }}>{visual.description}</div>
        )}
      </div>
    </div>
  );
}

// リッチパネル（tech-geo の RichPanel を縦長向けに最適化）
function RichPanelVisual({
  visual,
  accentColor,
}: {
  visual: RichPanelType;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(10,14,39,0.96) 0%, rgba(20,24,50,0.96) 100%)',
        border: `3px solid ${accentColor}`,
        borderRadius: 24,
        padding: '36px 44px',
        width: '96%',
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.92, 1])})`,
      }}
    >
      {/* ヘッダー */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        {visual.number != null && (
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: accentColor,
              color: '#000',
              fontWeight: '900',
              fontSize: 28,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {visual.number}
          </div>
        )}
        {visual.icon && (
          <span style={{ fontSize: 44, flexShrink: 0 }}>{visual.icon}</span>
        )}
        <div style={{ color: accentColor, fontSize: 40, fontWeight: '700', flex: 1 }}>
          {visual.title}
        </div>
      </div>

      {/* 本文 */}
      <div style={{ color: '#fff', fontSize: 36, lineHeight: 1.6, marginBottom: 16 }}>
        {visual.emphasis
          ? visual.body.split(visual.emphasis).map((part, i, arr) => (
              <span key={i}>
                {part}
                {i < arr.length - 1 && (
                  <span style={{ color: accentColor, fontWeight: '900' }}>{visual.emphasis}</span>
                )}
              </span>
            ))
          : visual.body}
      </div>

      {/* ポイントリスト */}
      {visual.points && visual.points.length > 0 && (
        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {visual.points.map((point, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <span style={{ color: accentColor, fontSize: 32, flexShrink: 0, lineHeight: 1.5 }}>▸</span>
              <span style={{ color: '#E0E4F0', fontSize: 32, lineHeight: 1.5 }}>{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// 統計値
function StatVisual({
  visual,
  accentColor,
}: {
  visual: StatType;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const scale = interpolate(progress, [0, 0.6, 1], [0.5, 1.08, 1]);

  return (
    <div
      style={{
        textAlign: 'center',
        opacity: progress,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          fontSize: 110,
          fontWeight: '900',
          color: accentColor,
          fontFamily: 'Montserrat, sans-serif',
          lineHeight: 1,
          letterSpacing: '-2px',
        }}
      >
        {visual.value}
      </div>
      <div
        style={{
          fontSize: 44,
          color: '#fff',
          fontWeight: '700',
          marginTop: 16,
          fontFamily: 'Noto Sans JP, sans-serif',
        }}
      >
        {visual.label}
      </div>
      {visual.subtext && (
        <div
          style={{
            fontSize: 32,
            color: '#B0B8D1',
            marginTop: 12,
          }}
        >
          {visual.subtext}
        </div>
      )}
    </div>
  );
}

// マルチ統計値（A vs B 並列比較に最適）
function MultiStatVisual({
  visual,
  accentColor,
}: {
  visual: MultiStatType;
  accentColor: string;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: 'clamp' });

  const cols = visual.stats.length <= 2 ? visual.stats.length : Math.ceil(visual.stats.length / 2);
  const rows = Math.ceil(visual.stats.length / cols);

  return (
    <div style={{ width: '100%', opacity: progress }}>
      {visual.title && (
        <div
          style={{
            color: '#B0B8D1',
            fontSize: 30,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 24,
            fontFamily: 'Noto Sans JP, sans-serif',
            letterSpacing: 1,
          }}
        >
          {visual.title}
        </div>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, auto)`,
          gap: 20,
        }}
      >
        {visual.stats.map((stat, i) => {
          const itemProgress = interpolate(frame, [i * 5, i * 5 + 18], [0, 1], {
            extrapolateRight: 'clamp',
          });
          const color = stat.color ?? accentColor;
          const scale = interpolate(itemProgress, [0, 0.6, 1], [0.75, 1.04, 1]);

          return (
            <div
              key={i}
              style={{
                background: `linear-gradient(135deg, rgba(10,14,39,0.95) 0%, rgba(26,31,58,0.92) 100%)`,
                border: `3px solid ${color}`,
                borderRadius: 20,
                padding: '28px 20px',
                textAlign: 'center',
                transform: `scale(${scale})`,
                opacity: itemProgress,
              }}
            >
              <div
                style={{
                  fontSize: 26,
                  color: '#B0B8D1',
                  fontFamily: 'Noto Sans JP, sans-serif',
                  marginBottom: 10,
                  lineHeight: 1.3,
                }}
              >
                {stat.label}
              </div>
              <div
                style={{
                  fontSize: visual.stats.length <= 2 ? 76 : 60,
                  fontWeight: '900',
                  color,
                  fontFamily: 'Montserrat, sans-serif',
                  lineHeight: 1,
                }}
              >
                {stat.value}
                {stat.unit && (
                  <span style={{ fontSize: visual.stats.length <= 2 ? 36 : 28, marginLeft: 6 }}>
                    {stat.unit}
                  </span>
                )}
              </div>
              {stat.subtext && (
                <div
                  style={{
                    fontSize: 24,
                    color: '#8A90A8',
                    marginTop: 10,
                    lineHeight: 1.4,
                  }}
                >
                  {stat.subtext}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ステップフロー（番号付きステップを縦列表示）
function StepFlowVisual({
  visual,
  accentColor,
  startFrame,
  frame,
}: {
  visual: StepFlowType;
  accentColor: string;
  startFrame: number;
  frame: number;
}) {
  return (
    <div style={{ width: '96%' }}>
      {visual.title && (
        <div
          style={{
            color: accentColor,
            fontSize: 36,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 28,
            fontFamily: 'Noto Sans JP, sans-serif',
          }}
        >
          {visual.title}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {visual.steps.map((step, i) => {
          const slideIn = interpolate(frame - startFrame - i * 8, [0, 18], [-60, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const opacity = interpolate(frame - startFrame - i * 8, [0, 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 20,
                background: 'rgba(255,255,255,0.06)',
                border: `2px solid ${accentColor}40`,
                borderRadius: 16,
                padding: '20px 24px',
                transform: `translateX(${slideIn}px)`,
                opacity,
              }}
            >
              {/* ステップ番号 */}
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: accentColor,
                  color: '#000',
                  fontWeight: '900',
                  fontSize: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontFamily: 'Montserrat, sans-serif',
                  boxShadow: `0 0 16px ${accentColor}60`,
                }}
              >
                {i + 1}
              </div>
              {/* コネクタ：最後以外 */}
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    color: '#fff',
                    fontSize: 34,
                    fontWeight: '700',
                    fontFamily: 'Noto Sans JP, sans-serif',
                  }}
                >
                  {step.label}
                </div>
                {step.detail && (
                  <div
                    style={{
                      color: '#8A90A8',
                      fontSize: 26,
                      marginTop: 6,
                      fontFamily: 'Noto Sans JP, sans-serif',
                    }}
                  >
                    {step.detail}
                  </div>
                )}
              </div>
              {/* 矢印アイコン */}
              <div style={{ color: accentColor, fontSize: 28, flexShrink: 0 }}>›</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// タイムライン（年表・複利成長マイルストーンなど）
function TimelineVisual({
  visual,
  accentColor,
  startFrame,
  fps,
  frame,
}: {
  visual: TimelineType;
  accentColor: string;
  startFrame: number;
  fps: number;
  frame: number;
}) {
  const animDuration = fps * 1.2;
  const relFrame = frame - startFrame;

  return (
    <div style={{ width: '100%' }}>
      {visual.title && (
        <div
          style={{
            color: accentColor,
            fontSize: 34,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 32,
            fontFamily: 'Noto Sans JP, sans-serif',
          }}
        >
          {visual.title}
        </div>
      )}
      {/* 中央縦ライン */}
      <div style={{ position: 'relative', paddingLeft: 40 }}>
        <div
          style={{
            position: 'absolute',
            left: 27,
            top: 12,
            bottom: 12,
            width: 3,
            background: `linear-gradient(to bottom, ${accentColor}, ${accentColor}30)`,
            borderRadius: 2,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {visual.items.map((item, i) => {
            const delay = Math.round((i / visual.items.length) * animDuration * 0.6);
            const slideIn = interpolate(relFrame - delay, [0, 16], [-30, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            const itemOpacity = interpolate(relFrame - delay, [0, 14], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            });
            // 最後のアイテムは accentColor で強調
            const isLast = i === visual.items.length - 1;
            const dotColor = isLast ? accentColor : `${accentColor}80`;
            const dotSize = isLast ? 22 : 16;

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  transform: `translateX(${slideIn}px)`,
                  opacity: itemOpacity,
                  position: 'relative',
                }}
              >
                {/* ドット */}
                <div
                  style={{
                    width: dotSize,
                    height: dotSize,
                    borderRadius: '50%',
                    background: dotColor,
                    flexShrink: 0,
                    boxShadow: isLast ? `0 0 20px ${accentColor}` : 'none',
                    marginLeft: -(dotSize / 2) - 0.5,
                  }}
                />
                {/* コンテンツ */}
                <div
                  style={{
                    background: isLast
                      ? `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`
                      : 'rgba(255,255,255,0.05)',
                    border: `2px solid ${isLast ? accentColor : `${accentColor}30`}`,
                    borderRadius: 14,
                    padding: '14px 20px',
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div
                      style={{
                        color: isLast ? accentColor : '#B0B8D1',
                        fontSize: 26,
                        fontWeight: '700',
                        fontFamily: 'Noto Sans JP, sans-serif',
                      }}
                    >
                      {item.label}
                    </div>
                    {item.detail && (
                      <div style={{ color: '#6A7090', fontSize: 22, marginTop: 4 }}>
                        {item.detail}
                      </div>
                    )}
                  </div>
                  {item.value && (
                    <div
                      style={{
                        color: isLast ? accentColor : '#E0E4F0',
                        fontSize: isLast ? 40 : 32,
                        fontWeight: '900',
                        fontFamily: 'Montserrat, sans-serif',
                        letterSpacing: '-1px',
                      }}
                    >
                      {item.value}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// フローチャート（SVGベース、ノードを矢印で縦に接続）
function FlowChartVisual({
  visual,
  accentColor,
  startFrame,
  frame,
}: {
  visual: FlowChartType;
  accentColor: string;
  startFrame: number;
  frame: number;
}) {
  const NODE_W = 700;
  const NODE_H = 90;
  const ARROW_H = 50;
  const DECISION_H = 100; // ひし形は高め
  const PAD_X = 100;

  // 各ノードの高さを計算
  const nodeHeights = visual.nodes.map((n) =>
    n.nodeType === 'decision' ? DECISION_H : NODE_H
  );
  const totalH =
    nodeHeights.reduce((s, h) => s + h, 0) + ARROW_H * (visual.nodes.length - 1) + 20;
  const SVG_W = NODE_W + PAD_X * 2;

  // Y座標を積み上げで計算
  const yPositions: number[] = [];
  let y = 10;
  for (const h of nodeHeights) {
    yPositions.push(y);
    y += h + ARROW_H;
  }

  const relFrame = frame - startFrame;

  return (
    <div style={{ width: '100%' }}>
      {visual.title && (
        <div
          style={{
            color: accentColor,
            fontSize: 32,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 16,
            fontFamily: 'Noto Sans JP, sans-serif',
          }}
        >
          {visual.title}
        </div>
      )}
      <svg
        width="100%"
        viewBox={`0 0 ${SVG_W} ${totalH}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {visual.nodes.map((node, i) => {
          const nodeType = node.nodeType ?? 'process';
          const nodeY = yPositions[i];
          const nodeH = nodeHeights[i];
          const cx = SVG_W / 2;
          const delay = i * 10;
          const progress = Math.min(1, Math.max(0, (relFrame - delay) / 14));
          const opacity = progress;
          const scale = 0.85 + 0.15 * progress;

          // ノードのスタイル設定
          const isStart = nodeType === 'start';
          const isEnd = nodeType === 'end';
          const isDecision = nodeType === 'decision';
          const fillColor =
            isEnd ? accentColor : isStart ? `${accentColor}33` : 'rgba(255,255,255,0.07)';
          const strokeColor = isEnd ? accentColor : accentColor;
          const textColor = isEnd ? '#000' : '#fff';

          // 矢印（最後以外）
          const arrowY = nodeY + nodeH;
          const arrowEndY = nodeY + nodeH + ARROW_H;

          return (
            <g key={i} opacity={opacity} transform={`scale(${scale}) translate(${(SVG_W * (1 - scale)) / (2 * scale)} ${(totalH * (1 - scale)) / (2 * scale)})`}>
              {/* 矢印 */}
              {i < visual.nodes.length - 1 && (
                <g opacity={Math.min(1, Math.max(0, (relFrame - delay - 8) / 10))}>
                  <line
                    x1={cx}
                    y1={arrowY}
                    x2={cx}
                    y2={arrowEndY - 12}
                    stroke={`${accentColor}80`}
                    strokeWidth={3}
                    strokeDasharray="6 4"
                  />
                  {/* 矢印頭 */}
                  <polygon
                    points={`${cx - 10},${arrowEndY - 14} ${cx + 10},${arrowEndY - 14} ${cx},${arrowEndY - 2}`}
                    fill={`${accentColor}80`}
                  />
                </g>
              )}

              {/* ノード形状 */}
              {isDecision ? (
                // ひし形
                <polygon
                  points={`${cx},${nodeY + 4} ${cx + NODE_W / 2},${nodeY + nodeH / 2} ${cx},${nodeY + nodeH - 4} ${cx - NODE_W / 2},${nodeY + nodeH / 2}`}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={2.5}
                />
              ) : (
                <rect
                  x={cx - NODE_W / 2}
                  y={nodeY}
                  width={NODE_W}
                  height={nodeH}
                  rx={isStart || isEnd ? nodeH / 2 : 14}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={isEnd ? 3 : 2}
                />
              )}

              {/* ラベル */}
              <text
                x={cx}
                y={nodeY + nodeH / 2 + (node.detail ? -8 : 10)}
                textAnchor="middle"
                fill={textColor}
                fontSize={isDecision ? '26' : '30'}
                fontWeight="700"
                fontFamily="Noto Sans JP, sans-serif"
              >
                {node.label}
              </text>
              {node.detail && (
                <text
                  x={cx}
                  y={nodeY + nodeH / 2 + 22}
                  textAnchor="middle"
                  fill={isEnd ? 'rgba(0,0,0,0.7)' : '#8A90A8'}
                  fontSize="22"
                  fontFamily="Noto Sans JP, sans-serif"
                >
                  {node.detail}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// 複合インフォグラフィック（ヘッドライン数値 + サポートポイント）
function InfographicVisual({
  visual,
  accentColor,
  startFrame,
  frame,
  fps,
}: {
  visual: InfographicType;
  accentColor: string;
  startFrame: number;
  frame: number;
  fps: number;
}) {
  const relFrame = frame - startFrame;
  const headerProgress = Math.min(1, relFrame / 16);
  const headerScale = 0.7 + 0.3 * headerProgress;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ヘッドライン: 大きな数値 */}
      <div
        style={{
          background: `linear-gradient(135deg, ${accentColor}22 0%, ${accentColor}11 100%)`,
          border: `3px solid ${accentColor}`,
          borderRadius: 24,
          padding: '28px 36px',
          textAlign: 'center',
          transform: `scale(${headerScale})`,
          opacity: headerProgress,
        }}
      >
        <div
          style={{
            color: '#B0B8D1',
            fontSize: 28,
            fontWeight: '700',
            fontFamily: 'Noto Sans JP, sans-serif',
            marginBottom: 8,
          }}
        >
          {visual.headline.label}
        </div>
        <div
          style={{
            color: accentColor,
            fontSize: 90,
            fontWeight: '900',
            fontFamily: 'Montserrat, sans-serif',
            lineHeight: 1,
            textShadow: `0 0 40px ${accentColor}60`,
          }}
        >
          {visual.headline.value}
          {visual.headline.unit && (
            <span style={{ fontSize: 42, marginLeft: 10 }}>{visual.headline.unit}</span>
          )}
        </div>
      </div>

      {/* サポートポイント */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {visual.points.map((point, i) => {
          const delay = 18 + i * 8;
          const pointProgress = Math.min(1, Math.max(0, (relFrame - delay) / 14));
          const slideX = (1 - pointProgress) * -40;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                background: 'rgba(255,255,255,0.06)',
                border: `1.5px solid rgba(255,255,255,0.12)`,
                borderRadius: 14,
                padding: '16px 22px',
                transform: `translateX(${slideX}px)`,
                opacity: pointProgress,
              }}
            >
              {point.icon && (
                <span style={{ fontSize: 36, flexShrink: 0 }}>{point.icon}</span>
              )}
              <div
                style={{
                  color: '#E0E4F0',
                  fontSize: 30,
                  fontFamily: 'Noto Sans JP, sans-serif',
                  lineHeight: 1.5,
                  flex: 1,
                }}
              >
                {point.highlight
                  ? point.text.split(point.highlight).map((part, j, arr) => (
                      <span key={j}>
                        {part}
                        {j < arr.length - 1 && (
                          <span style={{ color: accentColor, fontWeight: '900' }}>
                            {point.highlight}
                          </span>
                        )}
                      </span>
                    ))
                  : point.text}
              </div>
            </div>
          );
        })}
      </div>

      {/* フットノート */}
      {visual.footnote && (
        <div
          style={{
            color: '#6A7090',
            fontSize: 22,
            textAlign: 'center',
            opacity: Math.min(1, Math.max(0, (relFrame - 40) / 12)),
          }}
        >
          {visual.footnote}
        </div>
      )}
    </div>
  );
}

// ─── VersusCard（縦積みバトルカード）───────────────────────────────────
function VersusCardVisual({
  visual,
  frame,
  startFrame,
}: {
  visual: VersusCardType;
  frame: number;
  startFrame: number;
}) {
  const localFrame = frame - startFrame;

  // 上カード（左陣営）は上からスライドイン
  const topSlide  = interpolate(localFrame, [0, 22], [-80, 0], { extrapolateRight: 'clamp' });
  const topOpacity = interpolate(localFrame, [0, 18], [0, 1], { extrapolateRight: 'clamp' });

  // VS バーはスケールイン
  const vsScale  = interpolate(localFrame, [14, 28], [0.6, 1], { extrapolateRight: 'clamp' });
  const vsOpacity = interpolate(localFrame, [14, 28], [0, 1], { extrapolateRight: 'clamp' });

  // 下カード（右陣営）は下からスライドイン
  const botSlide  = interpolate(localFrame, [6, 28], [80, 0], { extrapolateRight: 'clamp' });
  const botOpacity = interpolate(localFrame, [6, 26], [0, 1], { extrapolateRight: 'clamp' });

  const renderItems = (
    items: VersusCardType['left']['items'],
    color: string,
    baseDelay: number,
  ) =>
    items.map((item, i) => {
      const p = interpolate(localFrame, [baseDelay + i * 5, baseDelay + i * 5 + 16], [0, 1], {
        extrapolateRight: 'clamp',
      });
      const barW = item.score !== undefined
        ? interpolate(localFrame, [baseDelay + i * 5 + 8, baseDelay + i * 5 + 28], [0, item.score], { extrapolateRight: 'clamp' })
        : 0;
      return (
        <div
          key={i}
          style={{
            opacity: p,
            transform: `translateX(${(1 - p) * -16}px)`,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '16px 18px',
            marginBottom: 10,
            background: 'rgba(255,255,255,0.05)',
            borderLeft: `5px solid ${color}`,
            borderRadius: 12,
          }}
        >
          {/* テキスト部 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 34,
                fontWeight: '800',
                color,
                fontFamily: 'Montserrat, sans-serif',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {item.name}
            </div>
            <div
              style={{
                fontSize: 26,
                color: '#A8B0CC',
                fontFamily: 'Noto Sans JP, sans-serif',
                lineHeight: 1.3,
                marginTop: 4,
              }}
            >
              {item.detail}
            </div>
          </div>
          {/* スコアバー + 数値 */}
          {item.score !== undefined && (
            <div style={{ width: 100, flexShrink: 0, textAlign: 'right' }}>
              <div
                style={{
                  fontSize: 40,
                  fontWeight: '900',
                  color,
                  fontFamily: 'Montserrat, sans-serif',
                  lineHeight: 1,
                }}
              >
                {Math.round(barW)}
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: 'rgba(255,255,255,0.12)',
                  marginTop: 5,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${barW}%`,
                    background: `linear-gradient(90deg, ${color}99, ${color})`,
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
          )}
        </div>
      );
    });

  const renderSideCard = (
    side: VersusCardType['left'],
    slide: number,
    opacity: number,
    bgGradient: string,
    itemDelay: number,
  ) => {
    const scoreVal = side.score !== undefined
      ? interpolate(localFrame, [itemDelay + 20, itemDelay + 40], [0, side.score], { extrapolateRight: 'clamp' })
      : undefined;
    return (
      <div
        style={{
          transform: `translateY(${slide}px)`,
          opacity,
          background: bgGradient,
          border: `2px solid ${side.color}`,
          borderRadius: 18,
          padding: '18px 18px 16px',
          boxShadow: `0 0 32px ${side.color}30`,
        }}
      >
        {/* ヘッダー行：ラベル + 総合スコア */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 40,
              fontWeight: '900',
              color: side.color,
              fontFamily: 'Noto Sans JP, sans-serif',
              textShadow: `0 0 20px ${side.color}80`,
              lineHeight: 1,
            }}
          >
            {side.label}
          </div>
          {scoreVal !== undefined && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 15, color: '#666E88', fontFamily: 'Noto Sans JP, sans-serif' }}>総合スコア</div>
              <div
                style={{
                  fontSize: 60,
                  fontWeight: '900',
                  color: side.color,
                  fontFamily: 'Montserrat, sans-serif',
                  lineHeight: 1,
                  textShadow: `0 0 16px ${side.color}60`,
                }}
              >
                {Math.round(scoreVal)}
              </div>
            </div>
          )}
        </div>
        {renderItems(side.items, side.color, itemDelay)}
      </div>
    );
  };

  return (
    // paddingTop: DynamicTitle ヘッダー（paddingTop:215 + テキスト~45px + padding:24）の下端を避ける
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 80 }}>
      {/* タイトル */}
      {visual.title && (
        <div
          style={{
            textAlign: 'center',
            fontSize: 34,
            fontWeight: '800',
            color: '#FFD700',
            fontFamily: 'Noto Sans JP, sans-serif',
            marginBottom: 10,
            letterSpacing: 1,
            textShadow: '0 0 20px #FFD70080',
            opacity: interpolate(localFrame, [0, 14], [0, 1], { extrapolateRight: 'clamp' }),
          }}
        >
          {visual.title}
        </div>
      )}

      {/* 上カード（左陣営） */}
      {renderSideCard(
        visual.left,
        topSlide,
        topOpacity,
        'linear-gradient(145deg, rgba(10,20,50,0.97) 0%, rgba(20,50,100,0.94) 100%)',
        18,
      )}

      {/* VS 区切りバー */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          padding: '12px 0',
          transform: `scale(${vsScale})`,
          opacity: vsOpacity,
        }}
      >
        <div style={{ flex: 1, height: 3, background: 'linear-gradient(to right, transparent, #FFD700)' }} />
        <div
          style={{
            fontSize: 64,
            fontWeight: '900',
            color: '#FFD700',
            fontFamily: 'Montserrat, sans-serif',
            lineHeight: 1,
            textShadow: '0 0 30px #FFD700, 0 0 60px #FFD70060',
            letterSpacing: 8,
          }}
        >
          VS
        </div>
        <div style={{ flex: 1, height: 3, background: 'linear-gradient(to left, transparent, #FFD700)' }} />
      </div>

      {/* 下カード（右陣営） */}
      {renderSideCard(
        visual.right,
        botSlide,
        botOpacity,
        'linear-gradient(145deg, rgba(10,5,10,0.97) 0%, rgba(60,10,10,0.94) 100%)',
        30,
      )}
    </div>
  );
}

export default VisualLayer;
