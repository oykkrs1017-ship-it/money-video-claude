import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ChartProps } from '../utils/types';

const PADDING = { top: 40, right: 30, bottom: 50, left: 60 };

export const DataChart: React.FC<ChartProps & { width?: number; height?: number }> = ({
  type,
  data,
  title,
  animationStyle,
  highlightIndex,
  width = 640,
  height = 360,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  const maxValue = Math.max(...data.map((d) => d.value));
  const minValue = 0;

  // アニメーション進捗 0→1
  const progress = spring({ frame, fps, config: { damping: 20, stiffness: 80, mass: 1 } });

  // 各データポイントのX座標
  const xOf = (i: number) => (i / (data.length - 1)) * innerW;
  // 各データポイントのY座標（上が小さいのでinvert）
  const yOf = (v: number) => innerH - ((v - minValue) / (maxValue - minValue || 1)) * innerH;

  // ハイライト用フェード
  const highlightOpacity = (i: number) =>
    highlightIndex !== undefined
      ? interpolate(frame, [0, 10], [1, i === highlightIndex ? 1 : 0.35], { extrapolateRight: 'clamp' })
      : 1;

  // ---- 折れ線チャート ----
  const renderLine = () => {
    const points = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(' ');
    // SVG polyline の stroke-dasharray でアニメーション
    const totalLength = data.reduce((acc, d, i) => {
      if (i === 0) return 0;
      const dx = xOf(i) - xOf(i - 1);
      const dy = yOf(d.value) - yOf(data[i - 1].value);
      return acc + Math.sqrt(dx * dx + dy * dy);
    }, 0);
    const dashLength = totalLength * progress;

    return (
      <>
        {/* エリア塗りつぶし */}
        <polygon
          points={`${xOf(0)},${innerH} ${points} ${xOf(data.length - 1)},${innerH}`}
          fill="rgba(100,160,255,0.15)"
        />
        {/* 折れ線 */}
        <polyline
          points={points}
          fill="none"
          stroke="#64a0ff"
          strokeWidth={3}
          strokeDasharray={`${dashLength} ${totalLength}`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* データポイント */}
        {data.map((d, i) => {
          const r = spring({ frame, fps, config: { damping: 15, stiffness: 200 }, delay: i * 3 });
          return (
            <g key={i} opacity={highlightOpacity(i)}>
              <circle cx={xOf(i)} cy={yOf(d.value)} r={interpolate(r, [0, 1], [0, 6])} fill={d.color ?? '#64a0ff'} />
              {highlightIndex === i && (
                <circle cx={xOf(i)} cy={yOf(d.value)} r={12} fill="none" stroke="#ffdd44" strokeWidth={2} />
              )}
            </g>
          );
        })}
      </>
    );
  };

  // ---- 棒グラフ ----
  const renderBar = () => {
    const barW = (innerW / data.length) * 0.65;
    return (
      <>
        {data.map((d, i) => {
          const barH = ((d.value - minValue) / (maxValue - minValue || 1)) * innerH * progress;
          const x = (i / data.length) * innerW + (innerW / data.length) * 0.175;
          return (
            <g key={i} opacity={highlightOpacity(i)}>
              <rect
                x={x}
                y={innerH - barH}
                width={barW}
                height={barH}
                fill={d.color ?? '#64a0ff'}
                rx={3}
              />
              {highlightIndex === i && (
                <rect x={x - 2} y={innerH - barH - 2} width={barW + 4} height={barH + 4}
                  fill="none" stroke="#ffdd44" strokeWidth={2} rx={4} />
              )}
            </g>
          );
        })}
      </>
    );
  };

  // ---- 円グラフ ----
  const renderPie = () => {
    const cx = innerW / 2;
    const cy = innerH / 2;
    const r = Math.min(innerW, innerH) / 2 - 10;
    const total = data.reduce((s, d) => s + d.value, 0);
    let startAngle = -Math.PI / 2;
    const colors = ['#64a0ff', '#ff6464', '#64ff96', '#ffdd44', '#ff9664', '#c864ff'];

    return (
      <>
        {data.map((d, i) => {
          const angle = (d.value / total) * Math.PI * 2 * progress;
          const endAngle = startAngle + angle;
          const x1 = cx + r * Math.cos(startAngle);
          const y1 = cy + r * Math.sin(startAngle);
          const x2 = cx + r * Math.cos(endAngle);
          const y2 = cy + r * Math.sin(endAngle);
          const largeArc = angle > Math.PI ? 1 : 0;
          const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
          const midAngle = startAngle + angle / 2;
          const labelR = r * 0.65;
          startAngle = endAngle;
          return (
            <g key={i} opacity={highlightOpacity(i)}>
              <path d={path} fill={d.color ?? colors[i % colors.length]} />
              {angle > 0.2 && (
                <text
                  x={cx + labelR * Math.cos(midAngle)}
                  y={cy + labelR * Math.sin(midAngle)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#fff"
                  fontSize={12}
                  fontWeight="bold"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
      </>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
      case 'area':
        return renderLine();
      case 'bar':
        return renderBar();
      case 'pie':
        return renderPie();
      default:
        return renderLine();
    }
  };

  return (
    <svg width={width} height={height} style={{ fontFamily: 'sans-serif' }}>
      {/* 背景 */}
      <rect width={width} height={height} fill="rgba(0,0,0,0.6)" rx={12} />

      {/* タイトル */}
      <text
        x={width / 2}
        y={22}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={16}
        fontWeight="bold"
        opacity={progress}
      >
        {title}
      </text>

      {/* チャート本体 */}
      <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
        {/* Y軸グリッド */}
        {type !== 'pie' &&
          [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = innerH - ratio * innerH;
            const val = Math.round(minValue + ratio * (maxValue - minValue));
            return (
              <g key={ratio}>
                <line x1={0} y1={y} x2={innerW} y2={y} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                <text x={-8} y={y} textAnchor="end" dominantBaseline="middle" fill="rgba(255,255,255,0.5)" fontSize={11}>
                  {val}
                </text>
              </g>
            );
          })}

        {/* X軸ラベル */}
        {type !== 'pie' &&
          data.map((d, i) => (
            <text
              key={i}
              x={type === 'bar' ? (i / data.length) * innerW + innerW / data.length / 2 : xOf(i)}
              y={innerH + 18}
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize={11}
              opacity={highlightOpacity(i)}
            >
              {d.label}
            </text>
          ))}

        {renderChart()}
      </g>
    </svg>
  );
};

export default DataChart;
