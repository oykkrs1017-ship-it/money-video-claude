import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import type { FlowNode } from '@money-video/domain';
import { GLASS } from '../styles/glass';

interface Props {
  title?: string;
  root: FlowNode;
  footer?: string;
  startFrame: number;
  endFrame: number;
  accentColor: string;
  width: number;
  height: number;
}

export const FlowChart: React.FC<Props> = ({
  title, root, footer, startFrame, endFrame, accentColor, width, height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  // アニメーション段階: 0→root, 1→矢印+子, 2→detail
  const revealProgress = interpolate(frame - startFrame, [0, 12, 28, 44], [0, 1, 2, 3], {
    extrapolateRight: 'clamp',
  });

  const children = root.children ?? [];
  const svgH = footer ? height * 0.78 : height * 0.88;
  const svgW = width;

  // ノード座標
  const rootX = svgW / 2;
  const rootY = 60;
  const rootW = Math.min(320, svgW * 0.34);
  const rootH = 82;

  const childY  = rootY + rootH + 80;
  const n = children.length;
  const childW  = n >= 3 ? Math.min(250, svgW * 0.23) : Math.min(260, svgW * 0.28);
  const childH  = 80;

  const detailY = childY + childH + 52;
  const detailW = childW + 60;
  const detailH = 90;

  // 中央基準の対称オフセット — ±svgW*0.185 で余裕を持たせる
  const maxStep = n >= 3 ? svgW * 0.185 : svgW * 0.26;
  const childrenX = children.map((_, i) => {
    if (n === 1) return rootX;
    const offset = (i - (n - 1) / 2) * maxStep;
    return rootX + offset;
  });

  const pRoot   = interpolate(revealProgress, [0, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pArrow  = interpolate(revealProgress, [1, 2], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const pDetail = interpolate(revealProgress, [2, 3], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  const nodeBox = (
    x: number, y: number, w: number, h: number,
    highlight: boolean, prog: number,
  ): React.CSSProperties => ({
    position: 'absolute',
    left: x - w / 2, top: y - h / 2,
    width: w, minHeight: h,
    background: highlight
      ? `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)`
      : 'rgba(255,255,255,0.93)',
    border: `2.5px solid ${highlight ? accentColor : 'rgba(40,60,120,0.25)'}`,
    borderRadius: 16,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    padding: '0 10px',
    opacity: prog,
    transform: `scale(${0.82 + 0.18 * prog})`,
    zIndex: 2,
    boxShadow: highlight
      ? `0 4px 16px ${accentColor}55`
      : '0 2px 10px rgba(0,0,0,0.12)',
  });

  return (
    <div style={{ width, height, opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      {title && (
        <div style={{ color: '#1a1a3e', fontSize: 26, fontWeight: 'bold', textAlign: 'center', marginBottom: 4 }}>
          {title}
        </div>
      )}

      <div style={{ position: 'relative', width: svgW, height: svgH, flexShrink: 0 }}>
        {/* SVG 矢印 */}
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}>
          <defs>
            <marker id="fc-arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
              <polygon points="0 0, 10 3.5, 0 7" fill={accentColor} />
            </marker>
          </defs>

          {/* root → child 曲線矢印 */}
          {children.map((_, i) => {
            const cx    = childrenX[i]!;
            const sy    = rootY + rootH / 2;
            const ey    = childY - childH / 2;
            const midY  = (sy + ey) / 2;
            const pathD = `M ${rootX} ${sy} C ${rootX} ${midY}, ${cx} ${midY}, ${cx} ${ey}`;
            const approxLen = Math.abs(cx - rootX) + Math.abs(ey - sy);
            return (
              <path key={i} d={pathD}
                stroke={accentColor} strokeWidth={2.5} fill="none"
                markerEnd="url(#fc-arrow)"
                strokeDasharray={approxLen}
                strokeDashoffset={approxLen * (1 - pArrow)}
              />
            );
          })}

          {/* child → detail 破線 */}
          {children.map((child, i) => {
            if (!child.detail) return null;
            const cx = childrenX[i]!;
            return (
              <line key={`dl${i}`}
                x1={cx} y1={childY + childH / 2}
                x2={cx} y2={detailY - detailH / 2}
                stroke="rgba(255,255,255,0.38)" strokeWidth={1.5}
                strokeDasharray="6 4" opacity={pDetail}
              />
            );
          })}
        </svg>

        {/* Root ノード */}
        <div style={nodeBox(rootX, rootY, rootW, rootH, !!root.highlight, pRoot)}>
          {root.icon && <span style={{ fontSize: 24, marginBottom: 2 }}>{root.icon}</span>}
          <div style={{ color: root.highlight ? '#ffffff' : '#1a1a3e', fontWeight: 'bold', fontSize: 26, textAlign: 'center' }}>{root.label}</div>
          {root.sublabel && <div style={{ color: root.highlight ? 'rgba(255,255,255,0.82)' : '#555577', fontSize: 18, textAlign: 'center', fontWeight: 'bold' }}>{root.sublabel}</div>}
        </div>

        {/* 子ノード */}
        {children.map((child, i) => (
          <div key={i} style={nodeBox(childrenX[i]!, childY, childW, childH, !!child.highlight, pArrow)}>
            {child.icon && <span style={{ fontSize: 20, marginBottom: 1 }}>{child.icon}</span>}
            <div style={{ color: child.highlight ? '#ffffff' : '#1a1a3e', fontWeight: 'bold', fontSize: 22, textAlign: 'center', lineHeight: 1.3 }}>{child.label}</div>
            {child.sublabel && <div style={{ color: child.highlight ? 'rgba(255,255,255,0.82)' : '#555577', fontSize: 15, textAlign: 'center', fontWeight: 'bold' }}>{child.sublabel}</div>}
          </div>
        ))}

        {/* Detail ボックス */}
        {children.map((child, i) => {
          if (!child.detail) return null;
          const color = child.detail.color ?? '#cc4444';
          return (
            <div key={`det${i}`} style={{
              position: 'absolute',
              left: childrenX[i]! - detailW / 2, top: detailY - detailH / 2,
              width: detailW, minHeight: detailH,
              background: 'rgba(255,255,255,0.90)',
              border: `2px solid ${color}`,
              borderRadius: 8, padding: '14px 18px',
              opacity: pDetail, zIndex: 2,
              boxShadow: `0 2px 10px ${color}33`,
            }}>
              {child.detail.title && (
                <div style={{ color, fontSize: 19, fontWeight: 'bold', marginBottom: 6 }}>{child.detail.title}</div>
              )}
              {child.detail.items.map((it, si) => (
                <div key={si} style={{ color: '#333355', fontSize: 19, lineHeight: 1.5, fontWeight: 'bold' }}>• {it}</div>
              ))}
            </div>
          );
        })}
      </div>

      {footer && (
        <div style={{
          background: 'rgba(30,40,100,0.10)', padding: '12px 24px',
          borderRadius: 8, color: '#2a2a4a', fontSize: 20, fontWeight: 'bold', textAlign: 'center', width: '100%',
          border: '1px solid rgba(30,40,100,0.15)',
        }}>
          {footer}
        </div>
      )}
    </div>
  );
};
