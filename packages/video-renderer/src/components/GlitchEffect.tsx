import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';

interface GlitchEffectProps {
  emotion: number;
  color: string;
  side: 'left' | 'right';
}

export const GlitchEffect: React.FC<GlitchEffectProps> = ({emotion, color, side}) => {
  const frame = useCurrentFrame();

  if (emotion < 80) return null;

  const intensity = interpolate(emotion, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // フレームごとにランダムなグリッチラインを生成
  const lines = Array.from({length: 4}, (_, i) => {
    const seed = frame * 17 + i * 131;
    const active = random(`glitch-active-${seed}`) > (1 - intensity * 0.4);
    if (!active) return null;
    const top = random(`glitch-top-${seed}`) * 100;
    const height = random(`glitch-height-${seed}`) * 4 + 1;
    const offsetX = (random(`glitch-offset-${seed}`) - 0.5) * 20 * intensity;
    const opacity = random(`glitch-opacity-${seed}`) * 0.6 * intensity;
    return {top, height, offsetX, opacity};
  }).filter(Boolean);

  const chromaOffset = intensity * 3;

  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        overflow: 'hidden',
      }}
    >
      {/* クロマアベレーション */}
      {intensity > 0.3 && (
        <AbsoluteFill
          style={{
            background: `linear-gradient(${side === 'left' ? '90deg' : '270deg'}, ${color}08 0%, transparent 40%)`,
            transform: `translateX(${chromaOffset}px)`,
            mixBlendMode: 'screen',
          }}
        />
      )}

      {/* グリッチライン */}
      {lines.map((line, i) =>
        line ? (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: `${line.top}%`,
              left: side === 'left' ? 0 : 'auto',
              right: side === 'right' ? 0 : 'auto',
              width: '40%',
              height: `${line.height}px`,
              background: `${color}`,
              opacity: line.opacity,
              transform: `translateX(${line.offsetX}px)`,
              mixBlendMode: 'screen',
            }}
          />
        ) : null
      )}
    </AbsoluteFill>
  );
};
