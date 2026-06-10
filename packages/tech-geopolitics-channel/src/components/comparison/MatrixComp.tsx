// ============================================================
// 4: マトリクス型 — MatrixComp.tsx
// アニメーション: X/Y軸伸長 → 象限background fade-in → アイテムバウンス
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { MatrixProps } from './types';

const DEFAULT_ITEMS = [
  { label: '三菱UFJ', x: -0.5, y: 0.7, color: '#2563eb', emoji: '🏦' },
  { label: '東京海上', x: 0.4, y: 0.8, color: '#0d9488', emoji: '🛡️' },
  { label: '三菱商事', x: -0.3, y: 0.5, color: '#d97706', emoji: '⚡' },
  { label: 'アドバンテスト', x: 0.7, y: -0.5, color: '#dc2626', emoji: '💻' },
];

const QUADRANTS = [
  { label: '割安×高収益', color: '#dcfce7', border: '#86efac', x: -1, y: 0, w: 1, h: 1 },
  { label: '割高×高収益', color: '#dbeafe', border: '#93c5fd', x: 0, y: 0, w: 1, h: 1 },
  { label: '割安×低収益', color: '#fef9c3', border: '#fde047', x: -1, y: -1, w: 1, h: 1 },
  { label: '割高×低収益', color: '#fee2e2', border: '#fca5a5', x: 0, y: -1, w: 1, h: 1 },
];

export const MatrixComp: React.FC<MatrixProps> = ({
  title = '2軸ポジショニング：割安度 × 収益性',
  xLabel = { left: '割安（低PBR）', right: '割高（高PBR）' },
  yLabel = { top: '高収益（高ROE）', bottom: '低収益（低ROE）' },
  items = DEFAULT_ITEMS,
  usage = '2軸評価・相対的な立ち位置比較',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const titleP = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });

  // Axis animation
  const axisP = interpolate(
    spring({ frame: Math.max(0, f - 10), fps, config: { damping: 20, stiffness: 70 } }),
    [0, 1], [0, 1]
  );

  // Quadrant fade
  const quadP = interpolate(
    spring({ frame: Math.max(0, f - 25), fps, config: { damping: 22, stiffness: 60 } }),
    [0, 1], [0, 1]
  );

  const size = Math.round(height * 0.78);
  const half = size / 2;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '36px 44px', boxSizing: 'border-box',
      background: 'linear-gradient(160deg, #f8fafc 0%, #fefce8 100%)',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    }}>
      {/* Title */}
      <div style={{
        opacity: interpolate(titleP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleP, [0, 1], [-14, 0])}px)`,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · マトリクス型
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{title}</div>
      </div>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', gap: 32, alignItems: 'center' }}>
        {/* Matrix SVG */}
        <div style={{ flexShrink: 0, position: 'relative' }}>
          <svg width={size} height={size} style={{ overflow: 'visible' }}>
            {/* Quadrant backgrounds */}
            {QUADRANTS.map((q, qi) => {
              const qDelay = 20 + qi * 6;
              const qp = interpolate(
                spring({ frame: Math.max(0, f - qDelay), fps, config: { damping: 20, stiffness: 80 } }),
                [0, 1], [0, 1]
              );
              const px = (q.x + 1) / 2 * size;
              const py = (1 - (q.y + 1)) / 2 * size;
              return (
                <rect key={qi}
                  x={px + 2} y={py + 2} width={half - 4} height={half - 4}
                  rx={8}
                  fill={q.color}
                  stroke={q.border}
                  strokeWidth={1}
                  opacity={qp * 0.85}
                />
              );
            })}

            {/* Axes */}
            {/* X axis */}
            <line
              x1={half * (1 - axisP)} y1={half}
              x2={half + half * axisP} y2={half}
              stroke="#1e293b" strokeWidth={2}
            />
            {/* Y axis */}
            <line
              x1={half} y1={half + half * axisP}
              x2={half} y2={half - half * axisP}
              stroke="#1e293b" strokeWidth={2}
            />
            {/* Arrowheads */}
            {axisP > 0.9 && (
              <>
                <polygon points={`${size},${half} ${size - 10},${half - 6} ${size - 10},${half + 6}`} fill="#1e293b" />
                <polygon points={`${half},0 ${half - 6},10 ${half + 6},10`} fill="#1e293b" />
              </>
            )}

            {/* Quadrant labels */}
            {QUADRANTS.map((q, qi) => {
              const lp = interpolate(
                spring({ frame: Math.max(0, f - 40 - qi * 5), fps, config: { damping: 20, stiffness: 80 } }),
                [0, 1], [0, 1]
              );
              const px = (q.x === -1 ? half * 0.5 : half * 1.5);
              const py = (q.y === 0 ? half * 0.5 : half * 1.5);
              return (
                <text key={qi}
                  x={px} y={py}
                  textAnchor="middle" dominantBaseline="middle"
                  fontSize={11} fontWeight={600} fill="#64748b"
                  opacity={lp}
                  style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
                >
                  {q.label}
                </text>
              );
            })}

            {/* Items */}
            {items.map((item, ii) => {
              const itemDelay = 50 + ii * 10;
              const ip = spring({ frame: Math.max(0, f - itemDelay), fps, config: { damping: 14, stiffness: 150 } });
              const ix = half + item.x * (half - 30);
              const iy = half - item.y * (half - 30);
              const scale = interpolate(ip, [0, 1], [0, 1]);
              const opacity = interpolate(ip, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

              return (
                <g key={ii} transform={`translate(${ix},${iy}) scale(${scale})`} opacity={opacity}>
                  <circle r={22} fill={item.color} stroke="#fff" strokeWidth={3}
                    style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.2))' }} />
                  <text textAnchor="middle" dominantBaseline="middle" fontSize={16}>{item.emoji}</text>
                  <text textAnchor="middle" y={36} fontSize={11} fontWeight={700}
                    fill={item.color} style={{ fontFamily: '"Noto Sans JP", sans-serif' }}>
                    {item.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Axis labels */}
          <div style={{
            position: 'absolute', top: half - 10, left: -8,
            fontSize: 11, color: '#64748b', fontWeight: 600,
            opacity: axisP, whiteSpace: 'nowrap',
          }}>{xLabel.left}</div>
          <div style={{
            position: 'absolute', top: half - 10, right: -8,
            fontSize: 11, color: '#64748b', fontWeight: 600,
            opacity: axisP, whiteSpace: 'nowrap',
          }}>{xLabel.right}</div>
          <div style={{
            position: 'absolute', top: -20, left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: '#64748b', fontWeight: 600,
            opacity: axisP, whiteSpace: 'nowrap',
          }}>{yLabel.top}</div>
          <div style={{
            position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)',
            fontSize: 11, color: '#64748b', fontWeight: 600,
            opacity: axisP, whiteSpace: 'nowrap',
          }}>{yLabel.bottom}</div>
        </div>

        {/* Legend */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#475569', marginBottom: 14 }}>銘柄一覧</div>
          {items.map((item, ii) => {
            const lp = spring({ frame: Math.max(0, f - 70 - ii * 8), fps, config: { damping: 20, stiffness: 100 } });
            return (
              <div key={ii} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 14,
                opacity: interpolate(lp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateX(${interpolate(lp, [0, 1], [20, 0])}px)`,
              }}>
                <span style={{ fontSize: 20 }}>{item.emoji}</span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: item.color }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    PBR: {((item.x + 1) * 0.5 * 1.5 + 0.5).toFixed(1)}倍 / ROE: {((item.y + 1) * 0.5 * 14 + 4).toFixed(0)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        marginTop: 8,
        opacity: interpolate(spring({ frame: Math.max(0, f - 90), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default MatrixComp;
