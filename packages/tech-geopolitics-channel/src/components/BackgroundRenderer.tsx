import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { BackgroundType } from '../utils/types';
import { ThemeConfig } from '../styles/themes';

interface BackgroundRendererProps {
  type: BackgroundType;
  theme: ThemeConfig;
}

export const BackgroundRenderer: React.FC<BackgroundRendererProps> = ({ type, theme }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  switch (type) {

    // ---- 1. gradient: ゆっくり回転するグラデーション ----
    case 'gradient': {
      const angle = interpolate(frame, [0, 600], [135, 225], { extrapolateRight: 'wrap' });
      return (
        <div style={{
          position: 'absolute', inset: 0,
          background: `linear-gradient(${angle}deg, ${theme.backgroundGradient[0]}, ${theme.backgroundGradient[1]})`,
        }} />
      );
    }

    // ---- 2. particles: ゆっくり漂うドット ----
    case 'particles': {
      const count = 40;
      // seed値からランダムな位置・速度を決定論的に生成
      const dots = Array.from({ length: count }, (_, i) => {
        const seedX = ((i * 2654435761) >>> 0) % 10000 / 10000;
        const seedY = ((i * 2246822519) >>> 0) % 10000 / 10000;
        const seedSpeed = 0.3 + (((i * 3266489917) >>> 0) % 10000 / 10000) * 0.7;
        const seedSize = 2 + (((i * 374761393) >>> 0) % 10000 / 10000) * 4;
        const x = seedX * width;
        // 上方向にゆっくり漂い、画面外に出たら下から再登場
        const totalTravel = height + 100;
        const y = ((seedY * height + frame * seedSpeed) % totalTravel) - 50;
        return { x, y, size: seedSize, opacity: 0.45 + seedSpeed * 0.35 };
      });

      return (
        <svg style={{ position: 'absolute', inset: 0 }} width={width} height={height}>
          <rect width={width} height={height} fill={theme.background} />
          {dots.map((d, i) => (
            <circle
              key={i}
              cx={d.x}
              cy={d.y}
              r={d.size}
              fill={theme.text}
              opacity={d.opacity}
            />
          ))}
        </svg>
      );
    }

    // ---- 3. grid: 奥行き感のあるグリッドがゆっくりスクロール ----
    case 'grid': {
      const gridSize = 80;
      const scrollY = (frame * 0.5) % gridSize;
      const scrollX = (frame * 0.2) % gridSize;
      return (
        <svg style={{ position: 'absolute', inset: 0 }} width={width} height={height}>
          <rect width={width} height={height} fill={theme.background} />
          <defs>
            <pattern
              id="grid-pattern"
              x={-scrollX}
              y={-scrollY}
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke={theme.text}
                strokeWidth={1.5}
                opacity={0.35}
              />
            </pattern>
          </defs>
          <rect width={width} height={height} fill="url(#grid-pattern)" />
          {/* 中心に向かうグラデーションオーバーレイ */}
          <defs>
            <radialGradient id="grid-vignette" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor={theme.background} stopOpacity={0} />
              <stop offset="100%" stopColor={theme.background} stopOpacity={0.7} />
            </radialGradient>
          </defs>
          <rect width={width} height={height} fill="url(#grid-vignette)" />
        </svg>
      );
    }

    // ---- 4. wave: サイン波が流れる ----
    case 'wave': {
      const layers = [
        { amplitude: 60, period: 0.004, speed: 0.04, opacity: 0.35, yRatio: 0.6 },
        { amplitude: 40, period: 0.006, speed: 0.07, opacity: 0.28, yRatio: 0.7 },
        { amplitude: 30, period: 0.008, speed: 0.03, opacity: 0.22, yRatio: 0.8 },
      ];

      const buildWavePath = (amp: number, period: number, speed: number, yBase: number) => {
        const points = Array.from({ length: width + 2 }, (_, x) => {
          const y = yBase + Math.sin((x * period) + frame * speed) * amp;
          return `${x},${y}`;
        });
        return `M 0,${height} L ${points.join(' L ')} L ${width},${height} Z`;
      };

      return (
        <svg style={{ position: 'absolute', inset: 0 }} width={width} height={height}>
          <rect width={width} height={height}
            fill={`url(#wave-bg)`} />
          <defs>
            <linearGradient id="wave-bg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.backgroundGradient[0]} />
              <stop offset="100%" stopColor={theme.backgroundGradient[1]} />
            </linearGradient>
          </defs>
          {layers.map((l, i) => (
            <path
              key={i}
              d={buildWavePath(l.amplitude, l.period, l.speed, height * l.yRatio)}
              fill={theme.text}
              opacity={l.opacity}
            />
          ))}
        </svg>
      );
    }

    // ---- 5. geometric: ゆっくり回転する幾何学図形 ----
    case 'geometric': {
      const shapes = [
        { cx: width * 0.1,  cy: height * 0.15, r: 120, type: 'circle', speed: 0.005 },
        { cx: width * 0.9,  cy: height * 0.8,  r: 150, type: 'circle', speed: -0.003 },
        { cx: width * 0.85, cy: height * 0.1,  r: 90,  type: 'triangle', speed: 0.008 },
        { cx: width * 0.15, cy: height * 0.85, r: 80,  type: 'triangle', speed: -0.006 },
        { cx: width * 0.5,  cy: height * 0.5,  r: 200, type: 'hexagon', speed: 0.002 },
      ];

      const makeTriangle = (cx: number, cy: number, r: number, angle: number) => {
        const points = [0, 1, 2].map(i => {
          const a = angle + (i * Math.PI * 2) / 3;
          return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
        });
        return points.join(' ');
      };

      const makeHexagon = (cx: number, cy: number, r: number, angle: number) => {
        const points = Array.from({ length: 6 }, (_, i) => {
          const a = angle + (i * Math.PI * 2) / 6;
          return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`;
        });
        return points.join(' ');
      };

      return (
        <svg style={{ position: 'absolute', inset: 0 }} width={width} height={height}>
          <rect width={width} height={height} fill={theme.background} />
          {shapes.map((s, i) => {
            const angle = frame * s.speed;
            const opacity = 0.20 + (i % 3) * 0.08;
            if (s.type === 'circle') {
              return (
                <circle key={i} cx={s.cx} cy={s.cy}
                  r={s.r + Math.sin(frame * 0.02 + i) * 10}
                  fill="none" stroke={theme.text}
                  strokeWidth={2.5} opacity={opacity} />
              );
            } else if (s.type === 'triangle') {
              return (
                <polygon key={i}
                  points={makeTriangle(s.cx, s.cy, s.r, angle)}
                  fill="none" stroke={theme.text}
                  strokeWidth={2.5} opacity={opacity} />
              );
            } else {
              return (
                <polygon key={i}
                  points={makeHexagon(s.cx, s.cy, s.r, angle)}
                  fill="none" stroke={theme.text}
                  strokeWidth={2.5} opacity={opacity} />
              );
            }
          })}
        </svg>
      );
    }

    default:
      return <div style={{ position: 'absolute', inset: 0, background: theme.background }} />;
  }
};

export default BackgroundRenderer;
