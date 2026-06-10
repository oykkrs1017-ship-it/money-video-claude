import React from 'react';
import { useCurrentFrame, interpolate, spring, useVideoConfig } from 'remotion';
import { DESIGN } from '../styles/designSystem';

interface DataCardProps {
  title: string;
  value: number;
  unit?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendLabel?: string; // 例: "前年比 +38%"
  startFrame?: number;
}

export const DataCard: React.FC<DataCardProps> = ({
  title,
  value,
  unit = '',
  trend = 'neutral',
  trendLabel,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  // カード登場アニメーション
  const appear = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 14, stiffness: 180, mass: 0.9 },
    durationInFrames: Math.floor(fps * 0.6),
  });

  // 数値カウントアップ（1秒かけて 0 → value）
  const countUpFrames = fps * 1.2;
  const displayValue = Math.round(
    interpolate(relativeFrame, [0, countUpFrames], [0, value], {
      extrapolateRight: 'clamp',
    }),
  );

  const trendColor =
    trend === 'up'
      ? DESIGN.colors.successGreen
      : trend === 'down'
      ? DESIGN.colors.accentPink
      : DESIGN.colors.textGray;

  const trendSymbol = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';

  return (
    <div
      style={{
        background: 'rgba(10,14,39,0.90)',
        border: `2px solid ${DESIGN.colors.accentCyan}50`,
        borderRadius: 24,
        padding: '28px 40px',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        transform: `translateY(${(1 - appear) * 40}px) scale(${0.85 + appear * 0.15})`,
        opacity: appear,
        boxShadow: `0 0 32px ${DESIGN.colors.accentCyan}20`,
      }}
    >
      {/* タイトル */}
      <div
        style={{
          fontFamily: DESIGN.fonts.body,
          fontSize: 24,
          fontWeight: 700,
          color: DESIGN.colors.textGray,
          marginBottom: 12,
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </div>

      {/* 数値 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontFamily: DESIGN.fonts.number,
            fontSize: 96,
            fontWeight: 900,
            color: DESIGN.colors.accentGold,
            lineHeight: 1,
            textShadow: `0 0 30px ${DESIGN.colors.accentGold}60`,
          }}
        >
          {displayValue.toLocaleString()}
        </span>
        {unit && (
          <span
            style={{
              fontFamily: DESIGN.fonts.body,
              fontSize: 36,
              fontWeight: 700,
              color: DESIGN.colors.textWhite,
              paddingBottom: 10,
            }}
          >
            {unit}
          </span>
        )}
      </div>

      {/* トレンド */}
      {trendLabel && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            marginTop: 12,
            fontFamily: DESIGN.fonts.body,
            fontSize: 22,
            fontWeight: 700,
            color: trendColor,
          }}
        >
          <span style={{ fontSize: 26 }}>{trendSymbol}</span>
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
};
