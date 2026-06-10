/**
 * NumberContextCard.tsx
 * 数値に文脈を付けることの重要性を示す2カード比較。
 * 左: 文脈なし（グレー・シンプル）、右: 文脈あり（ネイビーヘッダー＋ハイライトメトリクス）
 * 参照: スライド生成ナレッジ 画像6
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface MetricItem {
  key: string;
  value: string;
  highlight?: boolean;
}

interface BeforeData {
  label: string;
  value: string;
  description?: string;
}

interface AfterData {
  label: string;
  metrics: MetricItem[];
  description?: string;
}

interface NumberContextCardProps {
  title?: string;
  before: BeforeData;
  after: AfterData;
  startFrame: number;
  endFrame: number;
  width: number;
}

const NAVY   = '#1a3a5c';
const AMBER  = '#f59e0b';

export const NumberContextCard: React.FC<NumberContextCardProps> = ({
  title = '数値に文脈を加える',
  before,
  after,
  startFrame,
  endFrame,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = frame - startFrame;

  const fadeIn  = interpolate(elapsed, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  const beforeOpacity = interpolate(elapsed, [0, 16], [0, 1], { extrapolateRight: 'clamp' });
  const afterOpacity  = interpolate(elapsed, [12, 28], [0, 1], { extrapolateRight: 'clamp' });
  const afterX        = interpolate(elapsed, [12, 28], [20, 0], { extrapolateRight: 'clamp' });

  return (
    <div
      style={{
        width,
        background: '#f9fafb',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        opacity,
        fontFamily: "'Noto Sans JP', sans-serif",
      }}
    >
      {/* Header */}
      <div style={{ background: NAVY, padding: '14px 22px' }}>
        <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 900 }}>{title}</div>
      </div>

      {/* Two-card body */}
      <div style={{ display: 'flex', gap: 16, padding: 16 }}>

        {/* ── Before card (文脈なし) ── */}
        <div
          style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: 10,
            border: '2px solid #e5e7eb',
            overflow: 'hidden',
            opacity: beforeOpacity,
          }}
        >
          {/* card header — gray */}
          <div
            style={{
              background: '#9ca3af',
              padding: '8px 14px',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {before.label}
          </div>
          <div style={{ padding: '14px 16px' }}>
            {/* big value, plain */}
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: '#6b7280',
                letterSpacing: '-0.02em',
              }}
            >
              {before.value}
            </div>
            {before.description && (
              <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6, lineHeight: 1.5 }}>
                {before.description}
              </div>
            )}
          </div>
        </div>

        {/* ── After card (文脈あり) ── */}
        <div
          style={{
            flex: 1,
            background: '#ffffff',
            borderRadius: 10,
            border: `2px solid ${NAVY}`,
            overflow: 'hidden',
            opacity: afterOpacity,
            transform: `translateX(${afterX}px)`,
          }}
        >
          {/* card header — navy */}
          <div
            style={{
              background: NAVY,
              padding: '8px 14px',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {after.label}
          </div>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {after.metrics.map((m, mi) => {
              const metricDelay = mi * 6;
              const metricOpacity = interpolate(elapsed, [28 + metricDelay, 38 + metricDelay], [0, 1], {
                extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
              });
              return (
                <div
                  key={mi}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '5px 8px',
                    borderRadius: 6,
                    background: m.highlight ? '#fef3c7' : '#f8fafc',
                    border: m.highlight ? `1px solid ${AMBER}` : '1px solid #e5e7eb',
                    opacity: metricOpacity,
                  }}
                >
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: m.highlight ? 700 : 400 }}>
                    {m.key}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      color: m.highlight ? '#92400e' : NAVY,
                    }}
                  >
                    {m.value}
                  </span>
                </div>
              );
            })}
            {after.description && (
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4, lineHeight: 1.5 }}>
                {after.description}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
