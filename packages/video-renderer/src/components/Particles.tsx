import React from 'react';
import {AbsoluteFill, interpolate, random, useCurrentFrame} from 'remotion';

interface ParticlesProps {
  axisEmotion: number;
  lyraEmotion: number;
}

const PARTICLE_COUNT = 30;

export const Particles: React.FC<ParticlesProps> = ({axisEmotion, lyraEmotion}) => {
  const frame = useCurrentFrame();
  const avgEmotion = (axisEmotion + lyraEmotion) / 2;
  const speed = interpolate(avgEmotion, [0, 100], [0.3, 1.2]);
  const count = Math.floor(interpolate(avgEmotion, [0, 100], [8, PARTICLE_COUNT]));

  const particles = Array.from({length: count}, (_, i) => {
    const baseX = random(`px-${i}`) * 1920;
    const baseY = random(`py-${i}`) * 1080;
    const size = random(`ps-${i}`) * 3 + 1;
    const speedMul = random(`pspeed-${i}`) * 0.8 + 0.4;
    const colorChoice = random(`pc-${i}`) > 0.5;

    const x = (baseX + frame * speed * speedMul * 0.5) % 1920;
    const y = (baseY - frame * speed * speedMul * 0.8) % 1080;
    const adjustedY = y < 0 ? y + 1080 : y;

    const opacity = interpolate(avgEmotion, [20, 60], [0.1, 0.5], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }) * (random(`po-${i}`) * 0.5 + 0.5);

    return {x, y: adjustedY, size, opacity, color: colorChoice ? '#00d4ff' : '#bf5af2'};
  });

  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            opacity: p.opacity,
            boxShadow: `0 0 ${p.size * 2}px ${p.color}`,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};
