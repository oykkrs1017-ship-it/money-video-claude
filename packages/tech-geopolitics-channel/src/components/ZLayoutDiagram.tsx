/**
 * ZLayoutDiagram.tsx
 * Z字法則スライド。左列=番号付きルール一覧、右列=Z字矢印ダイアグラム（SVG）。
 * 参照: スライド生成ナレッジ 画像5
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface Rule {
  number: number;
  heading: string;
  description?: string;
}

interface DiagramLabels {
  tl?: string;
  tr?: string;
  bl?: string;
  br?: string;
  center?: string;
}

interface ZLayoutDiagramProps {
  title?: string;
  rules: Rule[];
  diagramLabels?: DiagramLabels;
  startFrame: number;
  endFrame: number;
  width: number;
}

const NAVY   = '#1a3a5c';
const GOLD   = '#f59e0b';
const ORANGE = '#f97316';

export const ZLayoutDiagram: React.FC<ZLayoutDiagramProps> = ({
  title = 'Z字法則',
  rules,
  diagramLabels = {},
  startFrame,
  endFrame,
  width,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const elapsed = frame - startFrame;

  const fadeIn  = interpolate(elapsed, [0, 18], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  // rule stagger
  const ruleOpacity = (idx: number) =>
    interpolate(elapsed, [idx * 10 + 8, idx * 10 + 22], [0, 1], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });
  const ruleX = (idx: number) =>
    interpolate(elapsed, [idx * 10 + 8, idx * 10 + 22], [-12, 0], {
      extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    });

  // Z arrow draw progress
  const arrowProgress = interpolate(elapsed, [20, 50], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  // SVG Z-path: TL → TR → BL → BR (4 corners of a 200×180 box)
  const svgW = 200;
  const svgH = 180;
  const pad  = 30;
  const TL = { x: pad,        y: pad };
  const TR = { x: svgW - pad, y: pad };
  const BL = { x: pad,        y: svgH - pad };
  const BR = { x: svgW - pad, y: svgH - pad };

  // total path length ≈ |TR-TL| + |BL-TR| + |BR-BL|
  const seg1 = TR.x - TL.x;                                         // horizontal top
  const seg2 = Math.hypot(BL.x - TR.x, BL.y - TR.y);               // diagonal
  const seg3 = BR.x - BL.x;                                         // horizontal bottom
  const totalLen = seg1 + seg2 + seg3;

  const pathD = `M${TL.x},${TL.y} L${TR.x},${TR.y} L${BL.x},${BL.y} L${BR.x},${BR.y}`;
  const dashTotal = totalLen;
  const dashOffset = dashTotal * (1 - arrowProgress);

  const cornerLabel = (x: number, y: number, text: string | undefined, anchor: 'start' | 'end', dy: number) =>
    text ? (
      <text
        x={x}
        y={y + dy}
        textAnchor={anchor}
        fontSize={11}
        fontWeight={700}
        fill={NAVY}
        fontFamily="'Noto Sans JP', sans-serif"
      >
        {text}
      </text>
    ) : null;

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
      {/* Header */}
      <div style={{ background: NAVY, padding: '14px 22px' }}>
        <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 900 }}>{title}</div>
      </div>

      {/* Body: 2-column */}
      <div style={{ display: 'flex', minHeight: 200 }}>
        {/* Left: rules */}
        <div
          style={{
            flex: 1,
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            borderRight: '1px solid #e5e7eb',
          }}
        >
          {rules.map((rule, ri) => (
            <div
              key={ri}
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'flex-start',
                opacity: ruleOpacity(ri),
                transform: `translateX(${ruleX(ri)}px)`,
              }}
            >
              {/* number badge */}
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: NAVY,
                  color: '#ffffff',
                  fontSize: 13,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {rule.number}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#171717' }}>{rule.heading}</div>
                {rule.description && (
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 3, lineHeight: 1.45 }}>
                    {rule.description}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Right: Z diagram */}
        <div
          style={{
            width: svgW + 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '10px 0',
          }}
        >
          <svg width={svgW} height={svgH} viewBox={`0 0 ${svgW} ${svgH}`}>
            {/* corner circles */}
            {[TL, TR, BL, BR].map((pt, i) => (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={10}
                fill={NAVY}
                opacity={arrowProgress > i * 0.25 ? 1 : 0}
              />
            ))}

            {/* Z path */}
            <path
              d={pathD}
              fill="none"
              stroke={GOLD}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={dashTotal}
              strokeDashoffset={dashOffset}
            />

            {/* arrowhead at BR */}
            {arrowProgress > 0.85 && (
              <polygon
                points={`${BR.x},${BR.y - 14} ${BR.x - 6},${BR.y - 4} ${BR.x + 6},${BR.y - 4}`}
                fill={GOLD}
                transform={`translate(0, 7)`}
              />
            )}

            {/* corner labels */}
            {cornerLabel(TL.x - 4, TL.y - 14, diagramLabels.tl, 'start', 0)}
            {cornerLabel(TR.x + 4, TR.y - 14, diagramLabels.tr, 'end', 0)}
            {cornerLabel(BL.x - 4, BL.y + 20, diagramLabels.bl, 'start', 0)}
            {cornerLabel(BR.x + 4, BR.y + 20, diagramLabels.br, 'end', 0)}
            {diagramLabels.center && (
              <text
                x={svgW / 2}
                y={svgH / 2}
                textAnchor="middle"
                fontSize={10}
                fill="#9ca3af"
                fontFamily="'Noto Sans JP', sans-serif"
              >
                {diagramLabels.center}
              </text>
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
