/**
 * AudienceTable.tsx
 * ターゲット別3行テーブル。各行: アイコン＋役職名＋関心事箇条書き＋重要指標(アンバーpill)
 * 参照: スライド生成ナレッジ 画像8
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface AudienceRow {
  icon?: string;
  role: string;
  interests: string[];
  metrics: string[];
}

interface AudienceTableProps {
  title?: string;
  rows: AudienceRow[];
  startFrame: number;
  endFrame: number;
  width: number;
}

const NAVY  = '#1a3a5c';
const AMBER = '#f59e0b';

// Default icons per row index if not provided
const DEFAULT_ICONS = ['👔', '📊', '💡'];

export const AudienceTable: React.FC<AudienceTableProps> = ({
  title = 'ターゲット別 情報設計',
  rows,
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

  const rowOpacity = (idx: number) =>
    interpolate(elapsed, [idx * 10 + 6, idx * 10 + 20], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  const rowY = (idx: number) =>
    interpolate(elapsed, [idx * 10 + 6, idx * 10 + 20], [14, 0], {
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

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '56px 160px 1fr 240px',
          background: '#f1f5f9',
          borderBottom: '2px solid #e2e8f0',
          padding: '6px 14px',
          gap: 8,
        }}
      >
        <div />
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>役職</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>関心事</div>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b' }}>重要指標</div>
      </div>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {rows.map((row, ri) => (
          <div
            key={ri}
            style={{
              display: 'grid',
              gridTemplateColumns: '56px 160px 1fr 240px',
              alignItems: 'start',
              gap: 8,
              padding: '12px 14px',
              borderBottom: ri < rows.length - 1 ? '1px solid #f1f5f9' : 'none',
              background: ri % 2 === 1 ? '#fafafa' : '#ffffff',
              opacity: rowOpacity(ri),
              transform: `translateY(${rowY(ri)}px)`,
            }}
          >
            {/* icon */}
            <div
              style={{
                fontSize: 26,
                textAlign: 'center',
                lineHeight: 1.2,
                paddingTop: 2,
              }}
            >
              {row.icon ?? DEFAULT_ICONS[ri] ?? '👤'}
            </div>

            {/* role */}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: NAVY,
                paddingTop: 2,
                lineHeight: 1.4,
              }}
            >
              {row.role}
            </div>

            {/* interests */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {row.interests.map((interest, ii) => (
                <div
                  key={ii}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 5,
                    fontSize: 11,
                    color: '#374151',
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ color: '#9ca3af', flexShrink: 0, marginTop: 1 }}>•</span>
                  <span>{interest}</span>
                </div>
              ))}
            </div>

            {/* metrics (amber pills) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 2 }}>
              {row.metrics.map((metric, mi) => (
                <div
                  key={mi}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 12,
                    background: '#fef3c7',
                    border: `1px solid ${AMBER}`,
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#92400e',
                    lineHeight: 1.4,
                  }}
                >
                  {metric}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
