import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DESIGN } from '../styles/designSystem';

type PatternType = 'solid' | 'gradient' | 'dots' | 'grid' | 'particles';

interface BackgroundSceneProps {
  color?: string | undefined;
  pattern?: PatternType;
  opacity?: number;
}

export const BackgroundScene: React.FC<BackgroundSceneProps> = ({
  color = DESIGN.colors.primaryBg,
  pattern = 'gradient',
  opacity = 1,
}) => {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        opacity,
      }}
    >
      {/* ベース背景 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            pattern === 'gradient' || pattern === 'particles'
              ? `linear-gradient(160deg, ${color}, ${DESIGN.colors.secondaryBg})`
              : color,
        }}
      />
      {/* パターンオーバーレイ */}
      {pattern === 'dots' && <DotsOverlay frame={frame} />}
      {pattern === 'grid' && <GridOverlay />}
      {/* particles は gradient + グリッド + 浮遊パーティクル */}
      {(pattern === 'gradient' || pattern === 'particles') && (
        <>
          <GridOverlay />
          <ParticlesOverlay frame={frame} />
        </>
      )}
    </div>
  );
};

const DotsOverlay: React.FC<{ frame: number }> = ({ frame }) => {
  const offset = (frame * 0.3) % 60;
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `radial-gradient(circle, ${DESIGN.colors.accentCyan}20 2px, transparent 2px)`,
        backgroundSize: '60px 60px',
        backgroundPosition: `${offset}px ${offset}px`,
      }}
    />
  );
};

const GridOverlay: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage: `
        linear-gradient(${DESIGN.colors.accentCyan}08 1px, transparent 1px),
        linear-gradient(90deg, ${DESIGN.colors.accentCyan}08 1px, transparent 1px)
      `,
      backgroundSize: '80px 80px',
    }}
  />
);

// 事前定義パーティクル（Math.random() は使わずフレームから計算）
const PARTICLE_DEFS = [
  { x: 80,  baseY: 400,  speed: 0.4, symbol: '¥',   opacity: 0.10, size: 22 },
  { x: 200, baseY: 800,  speed: 0.3, symbol: '%',   opacity: 0.08, size: 18 },
  { x: 320, baseY: 200,  speed: 0.5, symbol: '↑',   opacity: 0.12, size: 26 },
  { x: 450, baseY: 1100, speed: 0.35,symbol: '¥',   opacity: 0.09, size: 20 },
  { x: 560, baseY: 600,  speed: 0.45,symbol: '↓',   opacity: 0.08, size: 24 },
  { x: 680, baseY: 1500, speed: 0.28,symbol: '%',   opacity: 0.11, size: 16 },
  { x: 780, baseY: 300,  speed: 0.55,symbol: '↑',   opacity: 0.10, size: 22 },
  { x: 900, baseY: 900,  speed: 0.32,symbol: '¥',   opacity: 0.07, size: 28 },
  { x: 980, baseY: 1300, speed: 0.42,symbol: '%',   opacity: 0.09, size: 18 },
  { x: 130, baseY: 1600, speed: 0.38,symbol: '↑',   opacity: 0.12, size: 20 },
  { x: 260, baseY: 700,  speed: 0.48,symbol: '10',  opacity: 0.07, size: 16 },
  { x: 400, baseY: 1800, speed: 0.25,symbol: '↓',   opacity: 0.10, size: 22 },
  { x: 520, baseY: 1000, speed: 0.52,symbol: '¥',   opacity: 0.08, size: 24 },
  { x: 640, baseY: 1400, speed: 0.36,symbol: '100', opacity: 0.06, size: 14 },
  { x: 760, baseY: 500,  speed: 0.44,symbol: '↑',   opacity: 0.11, size: 20 },
  { x: 860, baseY: 1700, speed: 0.30,symbol: '%',   opacity: 0.08, size: 18 },
  { x: 50,  baseY: 1200, speed: 0.46,symbol: '¥',   opacity: 0.09, size: 26 },
  { x: 730, baseY: 100,  speed: 0.40,symbol: '↓',   opacity: 0.10, size: 22 },
  { x: 170, baseY: 1900, speed: 0.33,symbol: '1K',  opacity: 0.07, size: 14 },
  { x: 950, baseY: 650,  speed: 0.50,symbol: '↑',   opacity: 0.09, size: 20 },
];

const ParticlesOverlay: React.FC<{ frame: number }> = ({ frame }) => (
  <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
    {PARTICLE_DEFS.map((p, i) => {
      // フレームに応じて上方向にスクロール（1920pxで折り返し）
      const y = ((p.baseY - frame * p.speed * 0.8) % 1920 + 1920) % 1920;
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: p.x,
            top: y,
            color: DESIGN.colors.accentCyan,
            fontSize: p.size,
            fontFamily: DESIGN.fonts.number,
            fontWeight: 700,
            opacity: p.opacity,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {p.symbol}
        </div>
      );
    })}
  </div>
);
