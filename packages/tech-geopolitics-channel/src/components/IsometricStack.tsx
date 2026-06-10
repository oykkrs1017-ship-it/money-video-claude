import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import type { IsoLayer, IsoCorner } from '@money-video/domain';

interface Props {
  title?: string;
  layers: IsoLayer[];
  corners?: IsoCorner[];
  topLabel?: string;
  startFrame: number;
  endFrame: number;
  accentColor: string;
  width: number;
  height: number;
}

export const IsometricStack: React.FC<Props> = ({
  title, layers, corners, topLabel,
  startFrame, endFrame, accentColor, width, height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  // パーセント抽出（"INPEX（30%）" → 30）
  const parsePct = (label: string): number => {
    const m = label.match(/(\d+)%/);
    return m ? parseInt(m[1]!) : 0;
  };

  // corners の中からパーセント持つものをレイヤーとして扱う
  const cornerLayers: IsoLayer[] = (corners ?? []).filter(c => /\d+%/.test(c.label)).map(c => ({
    label: c.label,
    sublabel: c.sublabel,
    color: c.color ?? '#4a90d0',
  }));

  const allSegments: IsoLayer[] = [...layers, ...cornerLayers];
  const totalPct = allSegments.reduce((s, l) => s + parsePct(l.label), 0) || 100;

  const barReveal = interpolate(frame - startFrame, [10, 50], [0, 1], { extrapolateRight: 'clamp' });
  const labelReveal = interpolate(frame - startFrame, [30, 60], [0, 1], { extrapolateRight: 'clamp' });
  const noteReveal  = interpolate(frame - startFrame, [50, 70], [0, 1], { extrapolateRight: 'clamp' });

  const barH = 72;
  const barW = width - 80;

  // ノート（パーセントなしのcorner）
  const notes = (corners ?? []).filter(c => !/\d+%/.test(c.label));

  return (
    <div style={{ width, height, opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, justifyContent: 'center' }}>
      {title && (
        <div style={{ color: '#1a1a3e', fontSize: 28, fontWeight: 'bold', textAlign: 'center' }}>{title}</div>
      )}

      {/* 積み上げ水平バー */}
      <div style={{ width: barW, position: 'relative' }}>
        <div style={{
          display: 'flex', width: '100%', height: barH,
          borderRadius: 10, overflow: 'hidden',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        }}>
          {allSegments.map((seg, i) => {
            const pct = parsePct(seg.label);
            const segWidth = (pct / totalPct) * 100;
            const revealedWidth = segWidth * barReveal;
            return (
              <div key={i} style={{
                width: `${revealedWidth}%`,
                background: seg.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'width 0.1s',
                overflow: 'hidden',
                borderRight: i < allSegments.length - 1 ? '2px solid rgba(255,255,255,0.3)' : 'none',
              }}>
                <span style={{ color: '#ffffff', fontWeight: 'bold', fontSize: 22, whiteSpace: 'nowrap' }}>
                  {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 凡例カード */}
      <div style={{ display: 'flex', gap: 12, width: barW, flexWrap: 'wrap', opacity: labelReveal }}>
        {allSegments.map((seg, i) => {
          const sc = spring({ frame: frame - startFrame - 30 - i * 8, fps, config: { damping: 20, stiffness: 140 } });
          return (
            <div key={i} style={{
              flex: '1 1 180px',
              background: 'rgba(255,255,255,0.92)',
              border: `2px solid ${seg.color}`,
              borderTop: `5px solid ${seg.color}`,
              borderRadius: 10, padding: '14px 16px',
              boxShadow: `0 2px 10px ${seg.color}33`,
              transform: `scaleY(${sc})`, transformOrigin: 'top',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                {seg.icon && <span style={{ fontSize: 20 }}>{seg.icon}</span>}
                <span style={{ color: seg.color, fontWeight: 'bold', fontSize: 20 }}>{seg.label}</span>
              </div>
              {seg.sublabel && (
                <div style={{ color: '#444466', fontSize: 16, fontWeight: 'bold', lineHeight: 1.4 }}>{seg.sublabel}</div>
              )}
            </div>
          );
        })}
      </div>

      {/* ノート（パーセントなしのcorner） */}
      {notes.length > 0 && (
        <div style={{ display: 'flex', gap: 12, width: barW, opacity: noteReveal }}>
          {notes.map((note, i) => (
            <div key={i} style={{
              flex: 1,
              background: 'rgba(255,255,255,0.88)',
              border: `1px solid ${note.color ?? accentColor}55`,
              borderLeft: `5px solid ${note.color ?? accentColor}`,
              borderRadius: 8, padding: '12px 16px',
            }}>
              <div style={{ color: note.color ?? accentColor, fontWeight: 'bold', fontSize: 18, marginBottom: 4 }}>{note.label}</div>
              {note.sublabel && <div style={{ color: '#555577', fontSize: 15, fontWeight: 'bold' }}>{note.sublabel}</div>}
            </div>
          ))}
        </div>
      )}

      {topLabel && (
        <div style={{
          background: `${accentColor}22`, border: `1px solid ${accentColor}66`,
          padding: '10px 24px', borderRadius: 8,
          color: '#1a1a3e', fontSize: 18, fontWeight: 'bold', textAlign: 'center', width: barW,
          opacity: noteReveal,
        }}>
          {topLabel}
        </div>
      )}
    </div>
  );
};
