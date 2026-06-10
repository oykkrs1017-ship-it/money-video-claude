import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { GraphType, GraphDataPoint } from '../types/episode';
import { DESIGN } from '../styles/designSystem';

const DEFAULT_COLORS = [
  DESIGN.colors.accentCyan,
  DESIGN.colors.accentGold,
  DESIGN.colors.accentPink,
  DESIGN.colors.successGreen,
  '#FF8C00',
  '#9C27B0',
];

interface AnimatedGraphProps {
  graphType: GraphType;
  data: GraphDataPoint[];
  animationDuration?: number; // frames
  title?: string;
  startFrame?: number;
}

export const AnimatedGraph: React.FC<AnimatedGraphProps> = ({
  graphType,
  data,
  animationDuration = 45,
  title,
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;
  const progress = Math.min(1, relativeFrame / animationDuration);

  const maxValue = Math.max(...data.map((d) => d.value));

  return (
    <div
      style={{
        background: 'rgba(10,14,39,0.88)',
        borderRadius: 24,
        padding: '28px 32px 32px',
        border: `2px solid ${DESIGN.colors.accentCyan}50`,
        backdropFilter: 'blur(10px)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {title && (
        <div
          style={{
            fontFamily: DESIGN.fonts.heading,
            fontSize: 40,
            fontWeight: 900,
            color: DESIGN.colors.textWhite,
            marginBottom: 28,
            textAlign: 'center',
            lineHeight: 1.3,
            textShadow: '2px 2px 0 rgba(0,0,0,0.6)',
          }}
        >
          {title}
        </div>
      )}
      {graphType === 'bar' && (
        <BarGraph data={data} progress={progress} maxValue={maxValue} />
      )}
      {graphType === 'pie' && <PieGraph data={data} progress={progress} />}
      {graphType === 'line' && (
        <LineGraph data={data} progress={progress} maxValue={maxValue} />
      )}
      {graphType === 'comparison' && (
        <ComparisonGraph data={data} progress={progress} maxValue={maxValue} />
      )}
    </div>
  );
};

// ── 棒グラフ ───────────────────────────────────────────────────
const BarGraph: React.FC<{
  data: GraphDataPoint[];
  progress: number;
  maxValue: number;
}> = ({ data, progress, maxValue }) => {
  const barWidth = 180;
  const gap = 28;
  const maxHeight = 420;
  const labelH = 80; // ラベル領域の高さ
  const totalWidth = data.length * (barWidth + gap) - gap;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${totalWidth} ${maxHeight + labelH}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {data.map((d, i) => {
        const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const targetHeight = (d.value / maxValue) * maxHeight;
        const height = targetHeight * progress;
        const x = i * (barWidth + gap);
        const y = maxHeight - height;
        // カウントアップ値
        const displayValue = Math.round(d.value * Math.min(progress * 1.1, 1));

        return (
          <g key={i}>
            {/* バー本体 */}
            <rect x={x} y={y} width={barWidth} height={height} fill={color} rx={10} opacity={0.92} />
            {/* バー上部ハイライト */}
            <rect x={x} y={y} width={barWidth} height={Math.min(height, 12)} fill="rgba(255,255,255,0.25)" rx={10} />
            {/* ラベル */}
            <text
              x={x + barWidth / 2}
              y={maxHeight + 44}
              textAnchor="middle"
              fill={DESIGN.colors.textWhite}
              fontSize="28"
              fontWeight="700"
              fontFamily={DESIGN.fonts.body}
            >
              {d.label}
            </text>
            {/* 数値（カウントアップ） */}
            {progress >= 0.05 && (
              <text
                x={x + barWidth / 2}
                y={y - 12}
                textAnchor="middle"
                fill={color}
                fontSize="34"
                fontWeight="900"
                fontFamily={DESIGN.fonts.number}
              >
                {displayValue}{d.unit ?? ''}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

// ── 円グラフ ───────────────────────────────────────────────────
const PieGraph: React.FC<{ data: GraphDataPoint[]; progress: number }> = ({
  data,
  progress,
}) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = 200;
  const cx = 240;
  const cy = 240;
  let cumulativeAngle = -90;

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 360 * progress;
    const startAngle = cumulativeAngle;
    cumulativeAngle += angle;
    const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
    return { ...d, startAngle, angle, color };
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
      <svg width={480} height={480} viewBox="0 0 480 480">
        {slices.map((slice, i) => {
          const path = describeArc(cx, cy, radius, slice.startAngle, slice.startAngle + slice.angle);
          return (
            <path
              key={i}
              d={path}
              fill={slice.color}
              stroke={DESIGN.colors.primaryBg}
              strokeWidth={3}
            />
          );
        })}
        {/* 中心の白円（ドーナツ） */}
        <circle cx={cx} cy={cy} r={80} fill={DESIGN.colors.primaryBg} />
        <text x={cx} y={cy + 12} textAnchor="middle" fill={DESIGN.colors.textWhite} fontSize="28" fontWeight="900">
          合計
        </text>
      </svg>
      {/* 凡例 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {slices.map((slice, i) => {
          const pct = Math.round((slice.angle / 360) * 100);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 20, height: 20, borderRadius: 4, background: slice.color, flexShrink: 0 }} />
              <span style={{ fontFamily: DESIGN.fonts.body, fontSize: 28, fontWeight: 700, color: DESIGN.colors.textWhite }}>
                {slice.label}
              </span>
              <span style={{ fontFamily: DESIGN.fonts.number, fontSize: 30, fontWeight: 900, color: slice.color, marginLeft: 8 }}>
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function polarToCartesian(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg - 90) * (Math.PI / 180);
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// ── 折れ線グラフ ───────────────────────────────────────────────
const LineGraph: React.FC<{
  data: GraphDataPoint[];
  progress: number;
  maxValue: number;
}> = ({ data, progress, maxValue }) => {
  const W = 900;
  const H = 380;
  const padL = 60;  // 左端ラベルのクリッピング防止
  const padR = 60;  // 右端ラベルのクリッピング防止
  const padT = 50;
  const padB = 70;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const points: Array<GraphDataPoint & { x: number; y: number }> = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * innerW,
    y: padT + innerH - (d.value / maxValue) * innerH,
    ...d,
  }));

  const visibleCount = Math.max(1, Math.ceil(points.length * progress));
  const visiblePoints = points.slice(0, visibleCount);
  const pathD = visiblePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet">
      {/* 横軸 */}
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke={DESIGN.colors.textGray} strokeWidth={2} />
      {/* グリッド線（横） */}
      {[0.25, 0.5, 0.75].map((t) => (
        <line
          key={t}
          x1={padL}
          y1={padT + innerH * (1 - t)}
          x2={W - padR}
          y2={padT + innerH * (1 - t)}
          stroke={`${DESIGN.colors.textGray}30`}
          strokeWidth={1}
          strokeDasharray="8 8"
        />
      ))}
      {/* 線 */}
      {visiblePoints.length > 1 && (
        <path d={pathD} fill="none" stroke={DESIGN.colors.accentCyan} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      )}
      {/* ポイント + ラベル */}
      {visiblePoints.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={10} fill={DESIGN.colors.accentCyan} stroke={DESIGN.colors.primaryBg} strokeWidth={3} />
          {/* 値 */}
          <text x={p.x} y={p.y - 18} textAnchor="middle" fontSize="26" fontWeight="900" fill={DESIGN.colors.accentCyan} fontFamily={DESIGN.fonts.number}>
            {p.value}{p.unit ?? ''}
          </text>
          {/* ラベル */}
          <text x={p.x} y={padT + innerH + 44} textAnchor="middle" fontSize="26" fontWeight="700" fill={DESIGN.colors.textWhite} fontFamily={DESIGN.fonts.body}>
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
};

// ── 比較グラフ（横バー）───────────────────────────────────────
const ComparisonGraph: React.FC<{
  data: GraphDataPoint[];
  progress: number;
  maxValue: number;
}> = ({ data, progress, maxValue }) => {
  const W = 900;
  const barHeight = 80;
  const gap = 48;
  const labelW = 230;
  const valueW = 160; // 数値列の固定幅（右端）
  const barAreaW = W - labelW - valueW;

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${data.length * (barHeight + gap) - gap}`}
      preserveAspectRatio="xMidYMid meet"
    >
      {data.map((d, i) => {
        const color = d.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length];
        const barW = ((d.value / maxValue) * barAreaW) * progress;
        const y = i * (barHeight + gap);
        const displayValue = Math.round(d.value * Math.min(progress * 1.1, 1));
        const unitStr = d.unit ? d.unit : '';

        return (
          <g key={i}>
            {/* 左ラベル */}
            <text
              x={0}
              y={y + barHeight / 2 + 10}
              fontSize="26"
              fontWeight="700"
              fill={DESIGN.colors.textWhite}
              fontFamily={DESIGN.fonts.body}
            >
              {d.label}
            </text>
            {/* バー背景 */}
            <rect x={labelW} y={y} width={barAreaW} height={barHeight} fill={`${color}18`} rx={12} />
            {/* バー本体 */}
            <rect x={labelW} y={y} width={barW} height={barHeight} fill={color} rx={12} opacity={0.92} />
            {/* バー上ハイライト */}
            <rect x={labelW} y={y} width={barW} height={Math.min(barW > 0 ? 14 : 0, barHeight)} fill="rgba(255,255,255,0.18)" rx={12} />
            {/* 数値（右端固定列） */}
            {progress >= 0.05 && (
              <text
                x={W - valueW + 8}
                y={y + barHeight / 2 + 12}
                fontSize="34"
                fontWeight="900"
                fill={color}
                fontFamily={DESIGN.fonts.number}
                textAnchor="start"
              >
                {displayValue}{unitStr}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
