/**
 * FactInsightCompare.tsx
 * ファクト（悪い報告）vs インサイト（良い報告）の2列比較。
 * 左: ×赤バッジ（文脈なし）、右: ✓緑バッジ（示唆あり）
 * 参照: スライド生成ナレッジ 画像7
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface CompareColumn {
  label: string;
  items: string[];
}

interface FactInsightCompareProps {
  title?: string;
  bad: CompareColumn;
  good: CompareColumn;
  tip?: string;
  startFrame: number;
  endFrame: number;
  width: number;
}

const NAVY  = '#1a3a5c';
const RED   = '#ef4444';
const GREEN = '#22c55e';

export const FactInsightCompare: React.FC<FactInsightCompareProps> = ({
  title = 'ファクト vs インサイト',
  bad,
  good,
  tip,
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

  const badOpacity  = interpolate(elapsed, [0, 16], [0, 1], { extrapolateRight: 'clamp' });
  const goodOpacity = interpolate(elapsed, [14, 30], [0, 1], { extrapolateRight: 'clamp' });
  const goodX       = interpolate(elapsed, [14, 30], [18, 0], { extrapolateRight: 'clamp' });

  const itemDelay = (idx: number, base: number) =>
    interpolate(elapsed, [base + idx * 7, base + idx * 7 + 14], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

  return (
    <div
      style={{
        width,
        background: '#ffffff',
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

      {/* Two-column body */}
      <div style={{ display: 'flex', gap: 1, background: '#e5e7eb' }}>

        {/* Bad column */}
        <div
          style={{
            flex: 1,
            background: '#ffffff',
            padding: '14px 16px',
            opacity: badOpacity,
          }}
        >
          {/* badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#fef2f2',
              border: `1.5px solid ${RED}`,
              borderRadius: 20,
              padding: '4px 12px',
              marginBottom: 12,
            }}
          >
            <span style={{ color: RED, fontSize: 14, fontWeight: 900 }}>✕</span>
            <span style={{ color: RED, fontSize: 12, fontWeight: 700 }}>{bad.label}</span>
          </div>

          {/* items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {bad.items.map((item, ii) => (
              <div
                key={ii}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                  opacity: itemDelay(ii, 4),
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#fee2e2',
                    color: RED,
                    fontSize: 11,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  ✕
                </span>
                <span style={{ fontSize: 12, color: '#374151', lineHeight: 1.5 }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Good column */}
        <div
          style={{
            flex: 1,
            background: '#ffffff',
            padding: '14px 16px',
            opacity: goodOpacity,
            transform: `translateX(${goodX}px)`,
          }}
        >
          {/* badge */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#f0fdf4',
              border: `1.5px solid ${GREEN}`,
              borderRadius: 20,
              padding: '4px 12px',
              marginBottom: 12,
            }}
          >
            <span style={{ color: GREEN, fontSize: 14, fontWeight: 900 }}>✓</span>
            <span style={{ color: GREEN, fontSize: 12, fontWeight: 700 }}>{good.label}</span>
          </div>

          {/* items */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {good.items.map((item, ii) => (
              <div
                key={ii}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 7,
                  opacity: itemDelay(ii, 18),
                }}
              >
                <span
                  style={{
                    flexShrink: 0,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#dcfce7',
                    color: GREEN,
                    fontSize: 11,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 1,
                  }}
                >
                  ✓
                </span>
                <span style={{ fontSize: 12, color: '#171717', lineHeight: 1.5, fontWeight: 500 }}>
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tip footer */}
      {tip && (
        <div
          style={{
            background: '#f0fdf4',
            borderTop: `2px solid ${GREEN}`,
            padding: '8px 18px',
            fontSize: 11,
            color: '#15803d',
            fontWeight: 600,
          }}
        >
          💡 {tip}
        </div>
      )}
    </div>
  );
};
