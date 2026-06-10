import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface Column { label: string; winner?: boolean }
interface Row { label: string; values: string[] }

interface Props {
  title?: string;
  columns: Column[];
  rows: Row[];
  badge?: string;
  footer?: string;
  startFrame: number;
  endFrame: number;
  accentColor: string;
  width: number;
  height: number;
}

export const ComparisonTable: React.FC<Props> = ({
  title, columns, rows, badge, footer,
  startFrame, endFrame, accentColor, width, height,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame - startFrame, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [endFrame - fps * 0.4, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(fadeIn, fadeOut);

  const rowProgress = interpolate(frame - startFrame, [10, 45], [0, rows.length], {
    extrapolateRight: 'clamp',
  });

  const templateCols = `1.6fr ${columns.map(() => '1fr').join(' ')}`;

  return (
    <div style={{
      width, height, opacity,
      display: 'flex', flexDirection: 'column',
      justifyContent: 'center', alignItems: 'center', gap: 12,
    }}>
      {title && (
        <div style={{
          color: '#1a1a3e', fontSize: 28, fontWeight: 'bold',
          textAlign: 'center', marginBottom: 4,
        }}>
          {title}
        </div>
      )}

      <div style={{
        width: '100%', borderRadius: 12, overflow: 'hidden',
        border: '1px solid rgba(30,40,100,0.20)',
        background: 'rgba(255,255,255,0.92)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
      }}>
        {/* ヘッダー行 */}
        <div style={{ display: 'grid', gridTemplateColumns: templateCols }}>
          <div style={{ padding: '12px 18px' }} />
          {columns.map((col, i) => (
            <div key={i} style={{
              padding: '20px 16px', textAlign: 'center',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: col.winner ? '#ffffff' : '#444466',
              fontWeight: 'bold',
              fontSize: 28,
              background: col.winner ? accentColor : 'rgba(30,40,100,0.07)',
              borderLeft: '1px solid rgba(30,40,100,0.12)',
              borderBottom: col.winner ? `3px solid ${accentColor}` : '2px solid rgba(30,40,100,0.15)',
            }}>
              {col.label}
            </div>
          ))}
        </div>

        {/* データ行（順次フェードイン） */}
        {rows.map((row, ri) => {
          const rowOp = interpolate(rowProgress, [ri, ri + 0.6], [0, 1], {
            extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
          });
          return (
            <div key={ri} style={{
              display: 'grid', gridTemplateColumns: templateCols,
              background: ri % 2 === 0 ? 'rgba(30,40,100,0.04)' : 'transparent',
              borderTop: '1px solid rgba(30,40,100,0.10)',
              opacity: rowOp,
            }}>
              <div style={{ padding: '20px 20px', color: '#1a1a3e', fontWeight: 'bold', fontSize: 26, display: 'flex', alignItems: 'center' }}>
                {row.label}
              </div>
              {row.values.map((val, ci) => {
                const isWinner = columns[ci]?.winner;
                return (
                  <div key={ci} style={{
                    padding: '20px 16px', textAlign: 'center',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: isWinner ? '#1a1a3e' : '#555577',
                    fontWeight: 'bold',
                    fontSize: isWinner ? 28 : 26,
                    background: isWinner ? 'rgba(255,229,0,0.08)' : 'transparent',
                    borderLeft: '1px solid rgba(30,40,100,0.10)',
                  }}>
                    {val}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        {footer && (
          <div style={{
            flex: 1, background: 'rgba(30,40,100,0.08)',
            border: '1px solid rgba(30,40,100,0.15)',
            padding: '10px 20px', borderRadius: 8,
            color: '#2a2a4a', fontSize: 22, textAlign: 'center',
          }}>
            {footer}
          </div>
        )}
        {badge && (
          <div style={{
            background: accentColor, color: '#000000',
            padding: '12px 22px', borderRadius: 8,
            fontSize: 22, fontWeight: 'bold', whiteSpace: 'nowrap',
          }}>
            {badge}
          </div>
        )}
      </div>
    </div>
  );
};
