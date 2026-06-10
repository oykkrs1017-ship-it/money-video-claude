/**
 * GraphCatalogPanel.tsx
 * グラフ配色見本帳スタイルのビジュアル。
 * チャート種別ガイドを2列グリッドで表示し、Tips と決定フローボタンを末尾に配置する。
 * 参照: スライド生成ナレッジ Group A（4枚）
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

// ─── mini-chart SVG renderers ─────────────────────────────────────────────

const MiniPie: React.FC<{ color: string }> = ({ color }) => (
  <svg width={56} height={56} viewBox="0 0 56 56">
    <circle cx={28} cy={28} r={22} fill="#e5e7eb" />
    <path
      d="M28 28 L28 6 A22 22 0 0 1 50 28 Z"
      fill={color}
    />
    <path
      d="M28 28 L50 28 A22 22 0 0 1 28 50 Z"
      fill={color}
      opacity={0.55}
    />
    <circle cx={28} cy={28} r={8} fill="#ffffff" />
  </svg>
);

const MiniBar: React.FC<{ color: string }> = ({ color }) => {
  const bars = [0.4, 0.7, 0.55, 0.9, 0.65];
  return (
    <svg width={56} height={48} viewBox="0 0 56 48">
      {bars.map((h, i) => (
        <rect
          key={i}
          x={i * 10 + 3}
          y={48 - h * 40}
          width={7}
          height={h * 40}
          fill={i % 2 === 0 ? color : `${color}88`}
          rx={2}
        />
      ))}
    </svg>
  );
};

const MiniLine: React.FC<{ color: string }> = ({ color }) => {
  const pts = [[4, 36], [14, 24], [24, 28], [34, 14], [44, 8], [52, 18]];
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]} ${p[1]}`).join(' ');
  return (
    <svg width={56} height={44} viewBox="0 0 56 44">
      <polyline
        points={pts.map((p) => p.join(',')).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color} />
      ))}
    </svg>
  );
};

const MiniScatter: React.FC<{ color: string }> = ({ color }) => {
  const dots = [[10, 32], [18, 20], [26, 28], [30, 12], [38, 18], [44, 24], [20, 36], [36, 30]];
  return (
    <svg width={56} height={44} viewBox="0 0 56 44">
      {dots.map((d, i) => (
        <circle key={i} cx={d[0]} cy={d[1]} r={3.5} fill={i % 3 === 0 ? color : `${color}99`} />
      ))}
    </svg>
  );
};

const MiniHeatmap: React.FC<{ color: string }> = ({ color }) => {
  const grid = [
    [0.2, 0.6, 0.9, 0.4],
    [0.5, 0.8, 0.3, 0.7],
    [0.1, 0.4, 0.6, 0.95],
  ];
  return (
    <svg width={56} height={44} viewBox="0 0 56 44">
      {grid.map((row, ri) =>
        row.map((v, ci) => (
          <rect
            key={`${ri}-${ci}`}
            x={ci * 13 + 2}
            y={ri * 13 + 2}
            width={11}
            height={11}
            fill={color}
            opacity={v}
            rx={2}
          />
        ))
      )}
    </svg>
  );
};

function renderMiniChart(hint: string | undefined, color: string) {
  switch (hint) {
    case 'pie':      return <MiniPie color={color} />;
    case 'bar':      return <MiniBar color={color} />;
    case 'scatter':  return <MiniScatter color={color} />;
    case 'heatmap':  return <MiniHeatmap color={color} />;
    default:         return <MiniLine color={color} />;
  }
}

// ─── Props ─────────────────────────────────────────────────────────────────

interface ChartEntry {
  name: string;
  description?: string;
  chartHint?: 'pie' | 'bar' | 'line' | 'scatter' | 'heatmap';
}

interface Section {
  heading: string;
  color?: string;
  charts: ChartEntry[];
}

interface GraphCatalogPanelProps {
  title?: string;
  subtitle?: string;
  sections: Section[];
  tips?: string[];
  decisions?: { label: string; highlight?: boolean }[];
  startFrame: number;
  endFrame: number;
  width: number;
  accentColor?: string;
}

const NAVY   = '#1a3a5c';
const ORANGE = '#f97316';
const BLUE   = '#3b82f6';

// ─── Component ─────────────────────────────────────────────────────────────

export const GraphCatalogPanel: React.FC<GraphCatalogPanelProps> = ({
  title = 'グラフ種別 選択ガイド',
  subtitle,
  sections,
  tips = [],
  decisions = [],
  startFrame,
  endFrame,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = frame - startFrame;
  const totalDuration = endFrame - startFrame;

  const fadeIn  = interpolate(elapsed, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  // stagger: sections animate in one by one
  const sectionOpacity = (idx: number) =>
    interpolate(elapsed, [idx * 8, idx * 8 + 16], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

  const sectionY = (idx: number) =>
    interpolate(elapsed, [idx * 8, idx * 8 + 16], [16, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

  return (
    <div
      style={{
        width,
        background: '#ffffff',
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
        overflow: 'hidden',
        opacity,
        fontFamily: "'Noto Sans JP', sans-serif",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: NAVY,
          padding: '16px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div style={{ color: '#ffffff', fontSize: 22, fontWeight: 900, letterSpacing: '0.02em' }}>
          {title}
        </div>
        {subtitle && (
          <div style={{ color: '#93c5fd', fontSize: 13, fontWeight: 400 }}>{subtitle}</div>
        )}
      </div>

      {/* ── Sections grid ── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(sections.length, 2)}, 1fr)`,
          gap: 1,
          background: '#e5e7eb',
        }}
      >
        {sections.map((section, si) => {
          const sectionColor = section.color ?? (si % 2 === 0 ? ORANGE : BLUE);
          return (
            <div
              key={si}
              style={{
                background: '#ffffff',
                padding: '14px 18px',
                opacity: sectionOpacity(si),
                transform: `translateY(${sectionY(si)}px)`,
              }}
            >
              {/* section heading */}
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: sectionColor,
                  borderLeft: `3px solid ${sectionColor}`,
                  paddingLeft: 8,
                  marginBottom: 10,
                  letterSpacing: '0.04em',
                }}
              >
                {section.heading}
              </div>

              {/* chart entries */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {section.charts.map((chart, ci) => (
                  <div
                    key={ci}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      background: '#f8fafc',
                      borderRadius: 8,
                      padding: '6px 10px',
                    }}
                  >
                    <div style={{ flexShrink: 0 }}>
                      {renderMiniChart(chart.chartHint, sectionColor)}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#171717' }}>
                        {chart.name}
                      </div>
                      {chart.description && (
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2, lineHeight: 1.4 }}>
                          {chart.description}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tips ── */}
      {tips.length > 0 && (
        <div
          style={{
            background: '#f0f9ff',
            borderTop: '2px solid #bae6fd',
            padding: '10px 20px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 8,
          }}
        >
          {tips.map((tip, ti) => (
            <div
              key={ti}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 11,
                color: '#0369a1',
              }}
            >
              <span style={{ fontWeight: 700 }}>✓</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Decision buttons ── */}
      {decisions.length > 0 && (
        <div
          style={{
            padding: '10px 20px',
            display: 'flex',
            gap: 10,
            flexWrap: 'wrap',
            borderTop: '1px solid #e5e7eb',
          }}
        >
          {decisions.map((d, di) => (
            <div
              key={di}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                background: d.highlight ? NAVY : '#f3f4f6',
                color: d.highlight ? '#ffffff' : '#374151',
                fontSize: 12,
                fontWeight: d.highlight ? 700 : 400,
                border: `1px solid ${d.highlight ? NAVY : '#d1d5db'}`,
              }}
            >
              {d.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
