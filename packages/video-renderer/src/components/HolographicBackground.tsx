import React from 'react';
import {AbsoluteFill, useCurrentFrame, random} from 'remotion';

export const HolographicBackground: React.FC = () => {
  const frame = useCurrentFrame();

  // 背景グラデーション（白基調・クリーン）
  const bgStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #f0f4ff 0%, #e8eeff 30%, #f5f0ff 60%, #eef4ff 100%)',
  };

  // ホログラフィック配線図（SVGライン）
  const gridLines = Array.from({length: 12}, (_, i) => ({
    x1: random(`lx1-${i}`) * 1920,
    y1: random(`ly1-${i}`) * 1080,
    x2: random(`lx2-${i}`) * 1920,
    y2: random(`ly2-${i}`) * 1080,
    opacity: 0.04 + random(`lo-${i}`) * 0.06,
  }));

  // ノードポイント
  const nodes = Array.from({length: 20}, (_, i) => ({
    x: random(`nx-${i}`) * 1920,
    y: random(`ny-${i}`) * 1080,
    r: 1.5 + random(`nr-${i}`) * 2,
    opacity: 0.08 + random(`no-${i}`) * 0.12,
  }));

  // 浮遊光の粒子（小さな輝く点）
  const glowDots = Array.from({length: 40}, (_, i) => {
    const speed = random(`gs-${i}`) * 0.4 + 0.1;
    const x = (random(`gx-${i}`) * 1920 + frame * speed) % 1920;
    const y = (random(`gy-${i}`) * 1080 - frame * speed * 0.5 + 1080) % 1080;
    const pulse = 0.3 + Math.sin(frame * 0.05 + i) * 0.2;
    const isBlue = random(`gc-${i}`) > 0.5;
    return {x, y, r: 1 + random(`gr-${i}`) * 2, opacity: pulse * 0.4, isBlue};
  });

  return (
    <AbsoluteFill style={bgStyle}>
      {/* サブタルグリッド（水平・垂直） */}
      <svg width="1920" height="1080" style={{position: 'absolute', inset: 0}}>
        {/* グリッドライン */}
        {Array.from({length: 20}, (_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 54} x2="1920" y2={i * 54}
            stroke="#6080ff" strokeWidth="0.5" opacity="0.06" />
        ))}
        {Array.from({length: 36}, (_, i) => (
          <line key={`v${i}`} x1={i * 54} y1="0" x2={i * 54} y2="1080"
            stroke="#6080ff" strokeWidth="0.5" opacity="0.06" />
        ))}

        {/* ホログラフィック配線図 */}
        {gridLines.map((l, i) => (
          <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
            stroke="#4060ff" strokeWidth="0.8" opacity={l.opacity}
            strokeDasharray="4 8" />
        ))}

        {/* ノードポイント */}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r={n.r * 2} fill="#4060ff" opacity={n.opacity * 0.3} />
            <circle cx={n.x} cy={n.y} r={n.r} fill="#4060ff" opacity={n.opacity} />
          </g>
        ))}

        {/* 浮遊光の粒子 */}
        {glowDots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r}
            fill={d.isBlue ? '#00d4ff' : '#bf5af2'}
            opacity={d.opacity} />
        ))}
      </svg>

      {/* 光のグラデーションオーバーレイ（左右から中央へ光が差し込む） */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 80% at 20% 50%, rgba(0,212,255,0.06) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 60% 80% at 80% 50%, rgba(191,90,242,0.06) 0%, transparent 70%)',
      }} />
    </AbsoluteFill>
  );
};
