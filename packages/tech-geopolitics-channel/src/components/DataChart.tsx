import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { ChartProps } from '../utils/types';

export const DataChart: React.FC<ChartProps & { width?: number; height?: number }> = ({
  type,
  data,
  title,
  animationStyle,
  highlightIndex,
  width = 900,
  height = 520,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // フォントサイズをチャートサイズに比例させる
  const fs = {
    title:  Math.round(width * 0.030),  // ~28px at 900px
    axis:   Math.round(width * 0.022),  // ~20px
    label:  Math.round(width * 0.022),  // ~20px
    pie:    Math.round(width * 0.024),  // ~22px
    value:  Math.round(width * 0.026),  // ~24px（棒グラフ上部の値ラベル）
  };

  // 円グラフは上部ラベルがはみ出しやすいので余裕を多めに取る
  const isPie = type === 'pie';
  const PADDING = {
    top:    isPie ? fs.title + 64 : fs.title + 24,
    right:  isPie ? 80 : 24,
    bottom: isPie ? 64 : fs.label + 40,
    left:   isPie ? 80 : fs.axis * 5 + 16,
  };

  const innerW = width - PADDING.left - PADDING.right;
  const innerH = height - PADDING.top - PADDING.bottom;

  // 0 を必ず含む範囲にする（負値のみのデータでも棒が範囲内に収まる）
  const maxValue = Math.max(0, ...data.map((d) => d.value));
  const minValue = Math.min(0, ...data.map((d) => d.value));
  const range = maxValue - minValue || 1;

  const progress = spring({ frame, fps, config: { damping: 20, stiffness: 80, mass: 1 } });

  const xOf = (i: number) =>
    type === 'bar'
      ? (i / data.length) * innerW + innerW / data.length / 2
      : (i / Math.max(data.length - 1, 1)) * innerW;

  const yOf = (v: number) =>
    innerH - ((v - minValue) / range) * innerH;

  // 0ラインのY座標（棒グラフの基点）
  const zeroY = yOf(0);

  const highlightOpacity = (i: number) =>
    highlightIndex !== undefined
      ? interpolate(frame, [0, 10], [1, i === highlightIndex ? 1 : 0.35], { extrapolateRight: 'clamp' })
      : 1;

  const COLORS = ['#64a0ff', '#ff6464', '#64ff96', '#ffdd44', '#ff9664', '#c864ff', '#00d4ff', '#ff64c8'];

  // ---- 折れ線チャート ----
  const renderLine = () => {
    const pts = data.map((d, i) => `${xOf(i)},${yOf(d.value)}`).join(' ');
    const totalLen = data.reduce((acc, d, i) => {
      if (i === 0) return 0;
      const dx = xOf(i) - xOf(i - 1);
      const dy = yOf(d.value) - yOf(data[i - 1].value);
      return acc + Math.sqrt(dx * dx + dy * dy);
    }, 0);

    return (
      <>
        <polygon
          points={`${xOf(0)},${innerH} ${pts} ${xOf(data.length - 1)},${innerH}`}
          fill="rgba(100,160,255,0.15)"
        />
        <polyline
          points={pts}
          fill="none"
          stroke="#64a0ff"
          strokeWidth={4}
          strokeDasharray={`${totalLen * progress} ${totalLen}`}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {data.map((d, i) => {
          const r = spring({ frame, fps, config: { damping: 15, stiffness: 200 }, delay: i * 3 });
          return (
            <g key={i} opacity={highlightOpacity(i)}>
              <circle cx={xOf(i)} cy={yOf(d.value)} r={interpolate(r, [0, 1], [0, 8])} fill={d.color ?? '#64a0ff'} />
              {/* 値ラベル（上部） */}
              <text
                x={xOf(i)}
                y={yOf(d.value) - 14}
                textAnchor="middle"
                fill="#ffffff"
                fontSize={fs.value}
                fontWeight="bold"
                opacity={interpolate(r, [0, 1], [0, 1])}
              >
                {d.value}
              </text>
            </g>
          );
        })}
      </>
    );
  };

  // ---- 棒グラフ ----
  const renderBar = () => {
    const barW = (innerW / data.length) * 0.6;
    return (
      <>
        {/* 0ラインを表示（負値データがある場合に基点を明示） */}
        {minValue < 0 && (
          <line x1={0} y1={zeroY} x2={innerW} y2={zeroY}
            stroke="rgba(255,255,255,0.5)" strokeWidth={2} strokeDasharray="6 3" />
        )}
        {data.map((d, i) => {
          const isNeg = d.value < 0;
          const fullBarH = Math.abs(yOf(d.value) - zeroY);
          const animBarH = fullBarH * progress;
          // 正値: zeroYから上に伸びる / 負値: zeroYから下に伸びる
          const rectY = isNeg ? zeroY : zeroY - animBarH;
          const x = (i / data.length) * innerW + (innerW / data.length) * 0.2;
          const color = d.color ?? COLORS[i % COLORS.length];
          const valSpring = spring({ frame, fps, config: { damping: 18, stiffness: 160 }, delay: i * 4 });

          // 値ラベル位置: 正値は棒の上、負値は棒の下
          const labelCx = x + barW / 2;
          const labelY = isNeg
            ? zeroY + animBarH + fs.value + 8
            : zeroY - animBarH - 10;
          const labelFill = '#ffffff';

          const labelScale = interpolate(valSpring, [0, 0.6, 1], [0.4, 1.15, 1]);
          return (
            <g key={i} opacity={highlightOpacity(i)}>
              <rect
                x={x} y={rectY}
                width={barW} height={animBarH}
                fill={color} rx={4}
              />
              {/* 値ラベル: pop-in scale + opacity */}
              <g transform={`translate(${labelCx},${labelY}) scale(${labelScale}) translate(${-labelCx},${-labelY})`}
                 opacity={interpolate(valSpring, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' })}>
                <text
                  x={labelCx}
                  y={labelY}
                  textAnchor="middle"
                  fill={labelFill}
                  fontSize={fs.value}
                  fontWeight="bold"
                >
                  {d.value}
                </text>
              </g>
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
    const r = Math.min(innerW, innerH) / 2 - 16;
    const total = data.reduce((s, d) => s + d.value, 0);
    let startAngle = -Math.PI / 2;

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

          // ラベルを外側に引き出す
          const labelR = r * 1.18;
          const lx = cx + labelR * Math.cos(midAngle);
          const ly = cy + labelR * Math.sin(midAngle);

          const pct = Math.round((d.value / total) * 100);

          startAngle = endAngle;
          return (
            <g key={i} opacity={highlightOpacity(i)}>
              <path d={path} fill={d.color ?? COLORS[i % COLORS.length]} stroke="rgba(0,0,0,0.4)" strokeWidth={2} />
              {angle > 0.15 && (
                <>
                  <text
                    x={lx} y={ly - fs.pie * 0.3}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="#ffffff" fontSize={fs.pie} fontWeight="bold"
                  >
                    {d.label}
                  </text>
                  <text
                    x={lx} y={ly + fs.pie * 1.0}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(255,255,255,0.75)" fontSize={Math.round(fs.pie * 0.85)}
                  >
                    {pct}%
                  </text>
                </>
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
      case 'area': return renderLine();
      case 'bar':  return renderBar();
      case 'pie':  return renderPie();
      default:     return renderLine();
    }
  };

  return (
    <svg width={width} height={height} style={{ fontFamily: 'sans-serif', overflow: 'visible' }}>
      {/* 背景 */}
      <rect width={width} height={height} fill="rgba(8,10,24,0.92)" rx={14} />
      <rect width={width} height={4} fill="#4a9eff" rx={2} opacity={0.7} />

      {/* タイトル：円グラフは上端に固定、他は PADDING.top の 60% */}
      <text
        x={width / 2} y={isPie ? fs.title + 8 : PADDING.top * 0.6}
        textAnchor="middle"
        fill="#ffffff"
        fontSize={fs.title}
        fontWeight="bold"
        opacity={progress}
      >
        {title}
      </text>

      {/* チャート本体 */}
      <g transform={`translate(${PADDING.left}, ${PADDING.top})`}>
        {/* Y軸グリッド＋ラベル（stagger fade-in） */}
        {type !== 'pie' &&
          [0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
            const y = innerH - ratio * innerH;
            const val = Math.round(minValue + ratio * (maxValue - minValue));
            const gridOpacity = interpolate(
              progress,
              [idx * 0.06, idx * 0.06 + 0.25],
              [0, 0.12],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            const labelOpacity = interpolate(
              progress,
              [idx * 0.06, idx * 0.06 + 0.3],
              [0, 0.65],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            );
            return (
              <g key={ratio}>
                <line x1={0} y1={y} x2={innerW} y2={y}
                  stroke={`rgba(255,255,255,${gridOpacity.toFixed(2)})`} strokeDasharray="6 4" />
                <text
                  x={-10} y={y}
                  textAnchor="end" dominantBaseline="middle"
                  fill="rgba(255,255,255,0.65)"
                  fontSize={fs.axis}
                  opacity={labelOpacity / 0.65}
                >
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
              x={xOf(i)}
              y={innerH + fs.label + 8}
              textAnchor="middle"
              fill="rgba(255,255,255,0.8)"
              fontSize={fs.label}
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
