import React from 'react';
import {AbsoluteFill, useCurrentFrame, random} from 'remotion';

interface Cube {
  x: number; y: number;
  size: number;
  speed: number;
  rotSpeed: number;
  color: string;
  opacity: number;
}

export const DataCubes: React.FC = () => {
  const frame = useCurrentFrame();

  const cubes: Cube[] = Array.from({length: 12}, (_, i) => ({
    x: random(`cx-${i}`) * 1920,
    y: random(`cy-${i}`) * 900 + 90,
    size: 16 + random(`cs-${i}`) * 32,
    speed: random(`csp-${i}`) * 0.3 + 0.1,
    rotSpeed: (random(`cr-${i}`) - 0.5) * 0.8,
    color: random(`cc-${i}`) > 0.5 ? '#00d4ff' : '#bf5af2',
    opacity: 0.08 + random(`co-${i}`) * 0.12,
  }));

  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
        {cubes.map((cube, i) => {
          const x = (cube.x + frame * cube.speed) % 1920;
          const y = (cube.y - frame * cube.speed * 0.3 + 900) % 900 + 90;
          const s = cube.size;
          const h = s * 0.4; // 奥行き

          // アイソメトリック風キューブ
          const top = `${x},${y - s/2} ${x + s/2},${y - s/2 - h} ${x + s},${y - s/2} ${x + s/2},${y - s/2 + h}`;
          const left = `${x},${y - s/2} ${x},${y + s/2} ${x + s/2},${y + s/2 + h} ${x + s/2},${y - s/2 + h}`;
          const right = `${x + s},${y - s/2} ${x + s},${y + s/2} ${x + s/2},${y + s/2 + h} ${x + s/2},${y - s/2 + h}`;

          return (
            <g key={i} opacity={cube.opacity}>
              <polygon points={top} fill={cube.color} opacity="0.3"
                stroke={cube.color} strokeWidth="0.5" />
              <polygon points={left} fill={cube.color} opacity="0.15"
                stroke={cube.color} strokeWidth="0.5" />
              <polygon points={right} fill={cube.color} opacity="0.2"
                stroke={cube.color} strokeWidth="0.5" />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
