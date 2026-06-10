import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface CycleStep { label: string; sublabel?: string; icon?: string }

interface Props {
  title?: string;
  steps: CycleStep[];
  centerText?: string;
  footer?: string;
  startFrame: number;
  endFrame: number;
  accentColor: string;
  width: number;
  height: number;
}

export const CycleLoop: React.FC<Props> = ({
  title, steps, centerText, footer,
  startFrame, endFrame, accentColor, width, height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  const revealProgress = interpolate(frame - startFrame, [8, 50], [0, steps.length], {
    extrapolateRight: 'clamp',
  });
  const arrowReveal = interpolate(frame - startFrame, [20, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const diagramSize = Math.min(width * 0.92, footer ? height * 0.72 : height * 0.84);
  const cx = diagramSize / 2;
  const cy = diagramSize / 2;
  const radius = diagramSize * 0.31;
  const nodeW = Math.round(diagramSize * 0.20);
  const nodeH = Math.round(diagramSize * 0.11);

  const positions = steps.map((_, i) => {
    const angle = (i / steps.length) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });

  // ノード端からノード端への四分の三円弧パス
  const arcPath = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / len;
    const ny = dx / len;
    const ctrl = { x: mx + nx * radius * 0.45, y: my + ny * radius * 0.45 };
    return `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
  };

  // ノード外周端点を計算（矢印をノード境界まで短縮）
  const edgePoint = (from: { x: number; y: number }, to: { x: number; y: number }, hw: number, hh: number) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    const t = Math.min(hw, hh) / len * 1.1;
    return { x: from.x + dx * t, y: from.y + dy * t };
  };

  return (
    <div style={{ width, height, opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {title && (
        <div style={{ color: '#ffffff', fontSize: 28, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
          {title}
        </div>
      )}

      <div style={{ position: 'relative', width: diagramSize, height: diagramSize, flexShrink: 0 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
          <defs>
            <marker id="cl-arrow" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill={accentColor} />
            </marker>
          </defs>
          {/* ガイドサークル */}
          <circle cx={cx} cy={cy} r={radius}
            stroke="rgba(255,255,255,0.07)" strokeWidth={1} fill="none" strokeDasharray="6 4" />
          {/* 弧矢印 */}
          {steps.map((_, i) => {
            const from = positions[i]!;
            const to   = positions[(i + 1) % steps.length]!;
            const hw = nodeW / 2;
            const hh = nodeH / 2;
            const edgeFrom = edgePoint(from, to, hw, hh);
            const edgeTo   = edgePoint(to, from, hw, hh);
            const prog = Math.min(Math.max(arrowReveal * steps.length - i, 0), 1);
            return (
              <path key={i} d={arcPath(edgeFrom, edgeTo)}
                stroke={accentColor} strokeWidth={2.5} fill="none"
                markerEnd="url(#cl-arrow)" opacity={prog}
              />
            );
          })}
        </svg>

        {/* 中心テキスト */}
        {centerText && (
          <div style={{
            position: 'absolute',
            left: cx - 64, top: cy - 32, width: 128, height: 64,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(255,255,255,0.05)',
            border: `1px solid rgba(255,255,255,0.15)`,
            borderRadius: '50%', zIndex: 3,
          }}>
            <div style={{ color: accentColor, fontWeight: 'bold', fontSize: 18, textAlign: 'center', lineHeight: 1.2 }}>
              {centerText}
            </div>
          </div>
        )}

        {/* ステップノード */}
        {positions.map((pos, i) => {
          const step = steps[i]!;
          const nodeOp = interpolate(revealProgress, [i, i + 0.7], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          const nodeScale = interpolate(revealProgress, [i, i + 0.7], [0.72, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <div key={i} style={{
              position: 'absolute',
              left: pos.x - nodeW / 2, top: pos.y - nodeH / 2,
              width: nodeW, height: nodeH,
              background: 'rgba(18,18,38,0.97)',
              border: `2px solid ${accentColor}`,
              borderRadius: 10,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '6px 10px',
              opacity: nodeOp, transform: `scale(${nodeScale})`,
              zIndex: 4,
            }}>
              {step.icon && <div style={{ fontSize: 18, marginBottom: 1 }}>{step.icon}</div>}
              <div style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 16, textAlign: 'center', lineHeight: 1.25 }}>
                {step.label}
              </div>
              {step.sublabel && (
                <div style={{ color: '#aaaaaa', fontSize: 13, textAlign: 'center' }}>{step.sublabel}</div>
              )}
            </div>
          );
        })}
      </div>

      {footer && (
        <div style={{
          background: 'rgba(255,255,255,0.06)', padding: '12px 24px',
          borderRadius: 8, color: '#cccccc', fontSize: 19, textAlign: 'center', width: '100%',
        }}>
          {footer}
        </div>
      )}
    </div>
  );
};
