import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { StatCardData } from '../utils/types';

interface StatCardProps {
  data: StatCardData;
  startFrame: number;
  endFrame: number;
  accentColor?: string;
  /** 画像と同じ幅に合わせる（デフォルト: 1000px） */
  width?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  data,
  startFrame,
  endFrame,
  accentColor = '#4a9eff',
  width = 1000,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  const localFrame = frame - startFrame;

  // フェードイン（スケール付き）
  const entrance = spring({
    frame: localFrame,
    fps,
    config: { damping: 24, stiffness: 180, mass: 0.9 },
  });
  const scale = interpolate(entrance, [0, 1], [0.88, 1]);
  const opacity = Math.min(
    interpolate(entrance, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' }),
    interpolate(frame, [endFrame - fps * 0.6, endFrame], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  );

  // メイン数値のカウントアップ（数字だけ抽出して補完）
  const numMatch = data.value.match(/[\d,.]+/);
  const numStr = numMatch ? numMatch[0].replace(/,/g, '') : null;
  const numVal = numStr ? parseFloat(numStr) : null;
  const countProgress = interpolate(localFrame, [0, fps * 1.2], [0, 1], { extrapolateRight: 'clamp' });
  const displayValue = numVal !== null
    ? data.value.replace(/[\d,.]+/, Math.floor(numVal * countProgress).toLocaleString())
    : data.value;

  const height = Math.round(width * 0.38); // 黄金比に近い比率

  return (
    <div
      style={{
        position: 'absolute',
        top: '6%',
        left: '50%',
        width,
        zIndex: 40,
        opacity,
        transform: `translateX(-50%) scale(${scale})`,
      }}
    >
      <div
        style={{
          width: '100%',
          height,
          borderRadius: 14,
          border: `2px solid rgba(255,255,255,0.25)`,
          boxShadow: `0 12px 48px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}44, 0 0 40px ${accentColor}22`,
          background: `linear-gradient(135deg, rgba(10,10,20,0.95) 0%, rgba(20,20,40,0.92) 100%)`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          padding: '32px 48px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* 背景アクセントライン */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }} />

        {/* ラベル */}
        <div style={{
          fontSize: 28,
          color: 'rgba(255,255,255,0.65)',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          {data.label}
        </div>

        {/* メイン数値 */}
        <div style={{
          fontSize: Math.round(width * 0.13),
          fontWeight: 900,
          color: '#ffffff',
          lineHeight: 1,
          textShadow: `0 0 60px ${accentColor}88, 0 4px 16px rgba(0,0,0,0.8)`,
          letterSpacing: '-0.02em',
        }}>
          {displayValue}
        </div>

        {/* 補足テキスト */}
        {data.subtext && (
          <div style={{
            fontSize: 22,
            color: accentColor,
            fontWeight: 600,
            letterSpacing: '0.04em',
          }}>
            {data.subtext}
          </div>
        )}

        {/* 追加指標 */}
        {data.metrics && data.metrics.length > 0 && (
          <div style={{
            display: 'flex',
            gap: 32,
            marginTop: 8,
            paddingTop: 16,
            borderTop: '1px solid rgba(255,255,255,0.12)',
            width: '100%',
            justifyContent: 'center',
          }}>
            {data.metrics.map((m, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{m.key}</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ffffff' }}>{m.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* 底辺アクセントライン */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 4,
          background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
        }} />
      </div>
    </div>
  );
};

export default StatCard;
