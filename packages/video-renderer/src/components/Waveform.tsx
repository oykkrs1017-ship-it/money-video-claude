import React from 'react';
import {interpolate, random, useCurrentFrame} from 'remotion';

interface WaveformProps {
  color: string;
  isActive: boolean;
  emotion: number;
  side: 'left' | 'right';
}

export const Waveform: React.FC<WaveformProps> = ({color, isActive, emotion, side}) => {
  const frame = useCurrentFrame();

  const BAR_COUNT = 24;
  const opacity = interpolate(isActive ? 1 : 0, [0, 1], [0.15, 1]);
  const amplitude = interpolate(emotion, [0, 100], [8, 32]);

  // randomを使って有機的な波形生成（noise2Dの代替）
  const timeStep = Math.floor(frame / 3);
  const bars = Array.from({length: BAR_COUNT}, (_, i) => {
    const seed = `bar-${i}-t${timeStep}`;
    const noiseVal = random(seed) * 2 - 1; // -1 to 1 の範囲
    const height = isActive
      ? Math.max(4, (noiseVal + 1) * 0.5 * amplitude + 4)
      : 4;
    return height;
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 3,
        height: 48,
        opacity,
        flexDirection: side === 'right' ? 'row-reverse' : 'row',
      }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 4,
            height: h,
            background: `linear-gradient(to top, ${color}, ${color}66)`,
            borderRadius: 2,
            boxShadow: isActive ? `0 0 6px ${color}88` : 'none',
          }}
        />
      ))}
    </div>
  );
};
