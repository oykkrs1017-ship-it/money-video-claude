import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface TrafficItem {
  signal: 'go' | 'stop';
  label: string;
  sublabel?: string;
  items?: string[];
}

interface Props {
  title?: string;
  items: TrafficItem[];
  footer?: string;
  startFrame: number;
  endFrame: number;
  accentColor: string;
  width: number;
  height: number;
}

export const TrafficLight: React.FC<Props> = ({
  title, items, footer, startFrame, endFrame, accentColor, width, height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <div style={{
      width, height, opacity,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: 14,
    }}>
      {title && (
        <div style={{ color: '#1a1a3e', fontSize: 34, fontWeight: 'bold', textAlign: 'center' }}>
          {title}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 960 }}>
        {items.map((item, i) => {
          const isGo   = item.signal === 'go';
          const isCaution = (item.signal as string) === 'caution';
          const signalColor = isGo ? '#00aa33' : isCaution ? '#d97706' : '#cc2222';
          const bgColor     = isGo
            ? 'rgba(0,180,60,0.10)'
            : isCaution
            ? 'rgba(217,119,6,0.10)'
            : 'rgba(200,30,30,0.10)';
          const borderColor = isGo ? '#00aa33' : isCaution ? '#d97706' : '#cc2222';

          const sc = spring({
            frame: frame - startFrame - i * 10,
            fps,
            config: { damping: 18, stiffness: 150 },
          });

          return (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 20,
              background: 'rgba(255,255,255,0.88)',
              border: `2px solid ${borderColor}`,
              borderLeft: `6px solid ${borderColor}`,
              borderRadius: 12, padding: '14px 20px',
              transform: `scaleX(${sc})`, transformOrigin: 'left',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            }}>
              {/* 信号丸 */}
              <div style={{
                width: 62, height: 62, borderRadius: '50%', flexShrink: 0,
                background: signalColor, boxShadow: `0 0 16px ${signalColor}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 14 }}>
                  {isGo ? 'GO' : isCaution ? '注意' : 'STOP'}
                </span>
              </div>

              {/* コンテンツ */}
              <div style={{ flex: 1 }}>
                <div style={{ color: signalColor, fontWeight: 'bold', fontSize: 26, marginBottom: 4 }}>
                  {item.label}
                </div>
                {item.sublabel && (
                  <div style={{ color: '#444466', fontSize: 19, marginBottom: 5, fontWeight: 'bold' }}>{item.sublabel}</div>
                )}
                {item.items && item.items.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {item.items.map((sub, si) => (
                      <div key={si} style={{ color: '#333355', fontSize: 19, display: 'flex', gap: 6, fontWeight: 'bold' }}>
                        <span style={{ color: signalColor, fontWeight: 'bold' }}>•</span>{sub}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {footer && (
        <div style={{
          background: 'rgba(30,40,100,0.08)', border: '1px solid rgba(30,40,100,0.18)',
          padding: '12px 20px', borderRadius: 8,
          color: '#2a2a4a', fontSize: 19, fontWeight: 'bold', textAlign: 'center', width: '100%',
        }}>
          {footer}
        </div>
      )}
    </div>
  );
};
