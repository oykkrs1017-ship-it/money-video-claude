import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { ScaleBalanceSide } from '@money-video/domain';

interface Props {
  title?: string;
  left: ScaleBalanceSide;
  right: ScaleBalanceSide;
  footer?: string;
  startFrame: number;
  endFrame: number;
  accentColor: string;
  width: number;
  height: number;
}

export const ScaleBalance: React.FC<Props> = ({
  title, left, right, footer,
  startFrame, endFrame, accentColor, width, height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  // 傾き: left=down → 正の角度（右側が上がる）
  const tiltTarget = left.direction === 'down' ? 14 : -14;
  const tiltDeg = spring({
    frame: frame - startFrame - 12,
    fps,
    config: { damping: 22, stiffness: 80 },
  }) * tiltTarget;

  const revealProg = interpolate(frame - startFrame, [0, 28], [0, 1], { extrapolateRight: 'clamp' });
  const hasBoxes = !!(left.box || right.box);
  const svgH = (hasBoxes ? height * 0.48 : height * 0.60);
  const svgW = width;

  const cx     = svgW / 2;
  const pivotY = svgH * 0.42;
  const armLen = svgW * 0.34;
  const poleH  = svgH * 0.28;
  const panW   = 76;
  const hangLen = 44;

  const rad    = (tiltDeg * Math.PI) / 180;
  const lx     = cx - armLen * Math.cos(rad);
  const ly     = pivotY - armLen * Math.sin(rad);
  const rx     = cx + armLen * Math.cos(rad);
  const ry     = pivotY + armLen * Math.sin(rad);

  const leftColor  = left.direction  === 'up' ? '#22cc66' : '#ff6644';
  const rightColor = right.direction === 'up' ? '#22cc66' : '#ff6644';

  return (
    <div style={{ width, height, opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      {title && (
        <div style={{ color: '#1a1a3e', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>{title}</div>
      )}

      {/* 天秤 SVG */}
      <div style={{ position: 'relative', width: svgW, height: svgH, flexShrink: 0 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}
          opacity={revealProg}>
          {/* 支柱 */}
          <line x1={cx} y1={pivotY} x2={cx} y2={pivotY + poleH}
            stroke="rgba(40,60,120,0.55)" strokeWidth={4} strokeLinecap="round" />
          {/* 台座 */}
          <line x1={cx - 56} y1={pivotY + poleH} x2={cx + 56} y2={pivotY + poleH}
            stroke="rgba(40,60,120,0.55)" strokeWidth={5} strokeLinecap="round" />
          {/* ビーム */}
          <line x1={lx} y1={ly} x2={rx} y2={ry}
            stroke="#1a1a3e" strokeWidth={4} strokeLinecap="round" />
          {/* 支点円 */}
          <circle cx={cx} cy={pivotY} r={9} fill={accentColor} />

          {/* 左パン ロープ */}
          <line x1={lx} y1={ly + 8} x2={lx - panW / 3} y2={ly + 8 + hangLen * 0.45}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <line x1={lx} y1={ly + 8} x2={lx + panW / 3} y2={ly + 8 + hangLen * 0.45}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <line x1={lx - panW / 3} y1={ly + 8 + hangLen * 0.45} x2={lx - panW / 3} y2={ly + 8 + hangLen}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <line x1={lx + panW / 3} y1={ly + 8 + hangLen * 0.45} x2={lx + panW / 3} y2={ly + 8 + hangLen}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <rect x={lx - panW / 2} y={ly + 8 + hangLen} width={panW} height={14} rx={4}
            fill={leftColor} opacity={0.85} />

          {/* 右パン ロープ */}
          <line x1={rx} y1={ry + 8} x2={rx - panW / 3} y2={ry + 8 + hangLen * 0.45}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <line x1={rx} y1={ry + 8} x2={rx + panW / 3} y2={ry + 8 + hangLen * 0.45}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <line x1={rx - panW / 3} y1={ry + 8 + hangLen * 0.45} x2={rx - panW / 3} y2={ry + 8 + hangLen}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <line x1={rx + panW / 3} y1={ry + 8 + hangLen * 0.45} x2={rx + panW / 3} y2={ry + 8 + hangLen}
            stroke="rgba(40,60,120,0.38)" strokeWidth={2} />
          <rect x={rx - panW / 2} y={ry + 8 + hangLen} width={panW} height={14} rx={4}
            fill={rightColor} opacity={0.85} />
        </svg>

        {/* 左ラベル */}
        <div style={{
          position: 'absolute', left: lx - 110, top: ly - 88,
          width: 220, textAlign: 'center', opacity: revealProg, zIndex: 2,
        }}>
          <div style={{ color: leftColor, fontSize: 24, fontWeight: 'bold' }}>
            {left.direction === 'up' ? '↑' : '↓'} {left.label}
          </div>
          {left.sublabel && <div style={{ color: '#444466', fontSize: 17, marginTop: 2, fontWeight: 'bold' }}>{left.sublabel}</div>}
        </div>

        {/* 右ラベル */}
        <div style={{
          position: 'absolute', right: svgW - rx - 110, top: ry - 88,
          width: 220, textAlign: 'center', opacity: revealProg, zIndex: 2,
        }}>
          <div style={{ color: rightColor, fontSize: 24, fontWeight: 'bold' }}>
            {right.direction === 'up' ? '↑' : '↓'} {right.label}
          </div>
          {right.sublabel && <div style={{ color: '#444466', fontSize: 17, marginTop: 2, fontWeight: 'bold' }}>{right.sublabel}</div>}
        </div>
      </div>

      {/* Detail ボックス */}
      {hasBoxes && (
        <div style={{ display: 'flex', gap: 16, width: '100%', opacity: revealProg }}>
          {left.box && (
            <div style={{
              flex: 1, background: 'rgba(255,255,255,0.92)',
              border: '2px solid #4a90ff', borderRadius: 10, padding: '14px 16px',
              boxShadow: '0 2px 10px rgba(74,144,255,0.20)',
            }}>
              {left.box.title && (
                <div style={{ color: '#4a90ff', fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>
                  {left.box.title}
                </div>
              )}
              {left.box.items.map((it, i) => (
                <div key={i} style={{ color: '#333355', fontSize: 18, lineHeight: 1.45, fontWeight: 'bold' }}>• {it}</div>
              ))}
            </div>
          )}
          {right.box && (
            <div style={{
              flex: 1, background: 'rgba(255,255,255,0.92)',
              border: '2px solid #ff6644', borderRadius: 10, padding: '14px 16px',
              boxShadow: '0 2px 10px rgba(255,102,68,0.20)',
            }}>
              {right.box.title && (
                <div style={{ color: '#ff6644', fontWeight: 'bold', fontSize: 18, marginBottom: 6 }}>
                  ⚠️ {right.box.title}
                </div>
              )}
              {right.box.items.map((it, i) => (
                <div key={i} style={{ color: '#333355', fontSize: 18, lineHeight: 1.45, fontWeight: 'bold' }}>• {it}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {footer && (
        <div style={{
          background: 'rgba(30,40,100,0.10)', padding: '12px 24px',
          borderRadius: 8, color: '#2a2a4a', fontSize: 20, fontWeight: 'bold', textAlign: 'center', width: '100%',
          border: '1px solid rgba(30,40,100,0.18)',
        }}>
          {footer}
        </div>
      )}
    </div>
  );
};
