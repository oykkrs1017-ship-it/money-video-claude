// ============================================================
// 3: レーダーチャート型 — RadarChartComp.tsx
// アニメーション: 軸伸長 → 多角形描画 → ラベル fade-in
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { RadarChartProps } from './types';

const DEFAULT_AXES = [
  { label: '割安度' }, { label: '成長性' }, { label: '配当' },
  { label: '金利耐性' }, { label: '流動性' },
];
const DEFAULT_SERIES = [
  {
    label: '三菱UFJ',
    color: '#2563eb',
    fill: '#2563eb44',
    values: [4.5, 3, 4, 5, 4],
  },
  {
    label: '東京海上',
    color: '#0d9488',
    fill: '#0d948844',
    values: [3, 4.5, 3.5, 4, 3.5],
  },
];

function polarToXY(angle: number, r: number, cx: number, cy: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  };
}

export const RadarChartComp: React.FC<RadarChartProps> = ({
  title = '銘柄レーダー比較',
  axes = DEFAULT_AXES,
  series = DEFAULT_SERIES,
  maxValue = 5,
  usage = '複数評価軸のバランス・強み比較',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const titleP = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });

  // SVG dimensions — scale to available height
  const svgSize = Math.round(height * 0.78);
  const cx = svgSize / 2;
  const cy = svgSize / 2;
  const maxR = Math.round(svgSize * 0.36);
  const numAxes = axes.length;
  const angleStep = (2 * Math.PI) / numAxes;

  // Axis animation progress
  const axisP = interpolate(
    spring({ frame: Math.max(0, f - 8), fps, config: { damping: 25, stiffness: 60 } }),
    [0, 1], [0, 1]
  );

  // Polygon animation progress
  const polyP = interpolate(
    spring({ frame: Math.max(0, f - 30), fps, config: { damping: 20, stiffness: 60 } }),
    [0, 1], [0, 1]
  );

  // Build polygon points for a series
  const buildPolyPoints = (values: number[], progress: number) => {
    return axes.map((_, i) => {
      const angle = angleStep * i;
      const r = (values[i] / maxValue) * maxR * progress;
      return polarToXY(angle, r, cx, cy);
    });
  };

  // Web grid lines
  const gridLevels = [1, 2, 3, 4, 5];

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '36px 44px', boxSizing: 'border-box',
      background: 'linear-gradient(160deg, #f8fafc 0%, #f0fdfa 100%)',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    }}>
      {/* Title */}
      <div style={{
        opacity: interpolate(titleP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleP, [0, 1], [-14, 0])}px)`,
        marginBottom: 20,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · レーダーチャート型
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{title}</div>
      </div>

      {/* Chart + Legend */}
      <div style={{ flex: 1, display: 'flex', gap: 32, alignItems: 'center' }}>
        {/* SVG Radar */}
        <div style={{ flex: '0 0 auto' }}>
          <svg width={svgSize} height={svgSize} style={{ overflow: 'visible' }}>
            {/* Grid web */}
            {gridLevels.map((level) => {
              const r = (level / maxValue) * maxR * axisP;
              const pts = Array.from({ length: numAxes }).map((_, i) =>
                polarToXY(angleStep * i, r, cx, cy)
              );
              return (
                <polygon
                  key={level}
                  points={pts.map(p => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke="#e2e8f0"
                  strokeWidth={level === maxValue ? 2 : 1}
                />
              );
            })}

            {/* Axes */}
            {axes.map((_, i) => {
              const end = polarToXY(angleStep * i, maxR * axisP, cx, cy);
              return (
                <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y}
                  stroke="#cbd5e1" strokeWidth={1.5} />
              );
            })}

            {/* Series polygons */}
            {series.map((s, si) => {
              const pts = buildPolyPoints(s.values, polyP);
              const seriesDelay = 32 + si * 12;
              const sp = interpolate(
                spring({ frame: Math.max(0, f - seriesDelay), fps, config: { damping: 20, stiffness: 60 } }),
                [0, 1], [0, 1]
              );
              const sPts = buildPolyPoints(s.values, sp);
              return (
                <g key={si}>
                  <polygon
                    points={sPts.map(p => `${p.x},${p.y}`).join(' ')}
                    fill={s.fill}
                    stroke={s.color}
                    strokeWidth={2.5}
                    strokeLinejoin="round"
                  />
                  {sPts.map((pt, pi) => (
                    <circle key={pi} cx={pt.x} cy={pt.y} r={5}
                      fill={s.color} stroke="#fff" strokeWidth={2} />
                  ))}
                </g>
              );
            })}

            {/* Axis labels */}
            {axes.map((axis, i) => {
              const labelR = maxR + Math.round(svgSize * 0.07);
              const pt = polarToXY(angleStep * i, labelR, cx, cy);
              const labelP = spring({ frame: Math.max(0, f - 50 - i * 5), fps, config: { damping: 20, stiffness: 80 } });
              return (
                <text key={i}
                  x={pt.x} y={pt.y + 5}
                  textAnchor="middle"
                  fontSize={Math.round(svgSize * 0.026)}
                  fontWeight={700}
                  fill="#374151"
                  opacity={interpolate(labelP, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' })}
                  style={{ fontFamily: '"Noto Sans JP", sans-serif' }}
                >
                  {axis.label}
                </text>
              );
            })}
          </svg>
        </div>

        {/* Legend + descriptions */}
        <div style={{ flex: 1 }}>
          {series.map((s, si) => {
            const lp = spring({ frame: Math.max(0, f - 60 - si * 12), fps, config: { damping: 20, stiffness: 100 } });
            return (
              <div key={si} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                marginBottom: 24,
                opacity: interpolate(lp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateX(${interpolate(lp, [0, 1], [20, 0])}px)`,
              }}>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  backgroundColor: s.color, flexShrink: 0, marginTop: 3,
                }} />
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: s.color, marginBottom: 6 }}>{s.label}</div>
                  {axes.map((ax, ai) => (
                    <div key={ai} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: '#64748b', width: 60 }}>{ax.label}</div>
                      <div style={{
                        flex: 1, height: 6, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%', backgroundColor: s.color,
                          borderRadius: 999,
                          width: `${(s.values[ai] / maxValue) * 100}%`,
                        }} />
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: s.color, width: 24, textAlign: 'right' }}>
                        {s.values[ai]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        marginTop: 8,
        opacity: interpolate(spring({ frame: Math.max(0, f - 80), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default RadarChartComp;
