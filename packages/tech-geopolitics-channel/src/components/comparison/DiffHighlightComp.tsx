// ============================================================
// 7: 差分強調型 — DiffHighlightComp.tsx
// アニメーション: 共通行グレーで先に出現 → 差分行カラーでハイライト出現
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { DiffHighlightProps } from './types';

const DEFAULT_COLUMNS = ['A案（バリュー重視）', 'B案（グロース重視）'];
const DEFAULT_ROWS = [
  { label: '投資対象', values: ['金融・素材・商社', 'テック・半導体'], isDiff: true },
  { label: '目標リターン', values: ['年率 8〜10%', '年率 15〜20%'], isDiff: true },
  { label: '配当収入', values: ['3.0〜3.5%', '0.5〜1.0%'], isDiff: true },
  { label: 'リスク水準', values: ['低〜中', '中〜高'], isDiff: true },
  { label: '投資期間', values: ['3〜5年', '5〜10年'], isDiff: false },
  { label: '通貨', values: ['日本円', '日本円'], isDiff: false },
  { label: '税制', values: ['NISA対応', 'NISA対応'], isDiff: false },
];

export const DiffHighlightComp: React.FC<DiffHighlightProps> = ({
  title = '投資戦略の差分比較',
  columns = DEFAULT_COLUMNS,
  rows = DEFAULT_ROWS,
  diffColor = '#6366f1',
  usage = '似た選択肢の違いだけを把握',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const titleP = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });

  // Separate common and diff rows for stagger ordering
  const commonRows = rows.filter(r => !r.isDiff);
  const diffRows = rows.filter(r => r.isDiff);

  const gridCols = `1.6fr ${columns.map(() => '1fr').join(' ')}`;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '36px 44px', boxSizing: 'border-box',
      background: 'linear-gradient(160deg, #f8fafc 0%, #fdf4ff 100%)',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    }}>
      {/* Title */}
      <div style={{
        opacity: interpolate(titleP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleP, [0, 1], [-14, 0])}px)`,
        marginBottom: 22,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · 差分強調型
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{title}</div>
        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: '#e2e8f0' }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>共通項目</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: diffColor }} />
            <span style={{ fontSize: 11, color: '#64748b' }}>差分項目（重要）</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        opacity: interpolate(titleP, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, backgroundColor: '#1e293b' }}>
          <div style={{ padding: '12px 18px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>比較項目</div>
          {columns.map((col, i) => {
            const hp = spring({ frame: Math.max(0, f - 10 - i * 8), fps, config: { damping: 18, stiffness: 120 } });
            return (
              <div key={i} style={{
                padding: '12px 8px', textAlign: 'center',
                opacity: interpolate(hp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(hp, [0, 1], [-10, 0])}px)`,
              }}>
                <div style={{
                  display: 'inline-block', backgroundColor: '#475569',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  padding: '3px 12px', borderRadius: 999,
                }}>
                  {col}
                </div>
              </div>
            );
          })}
        </div>

        {/* Rows — common first (muted), then diff (highlighted) */}
        {rows.map((row, ri) => {
          const isDiff = row.isDiff;
          // Common rows appear early, diff rows appear after
          const commonIndex = commonRows.indexOf(row);
          const diffIndex = diffRows.indexOf(row);
          const rowDelay = isDiff
            ? 20 + commonRows.length * 10 + 15 + diffIndex * 12
            : 20 + commonIndex * 10;

          const rp = spring({ frame: Math.max(0, f - rowDelay), fps, config: { damping: 20, stiffness: 110 } });
          const rowOpacity = interpolate(rp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
          const rowY = interpolate(rp, [0, 1], [14, 0]);
          const rowScale = isDiff
            ? interpolate(rp, [0, 1], [0.97, 1])
            : 1;

          return (
            <div key={ri} style={{
              display: 'grid', gridTemplateColumns: gridCols,
              backgroundColor: isDiff ? `${diffColor}0d` : (ri % 2 === 0 ? '#ffffff' : '#f8fafc'),
              borderBottom: isDiff ? `2px solid ${diffColor}44` : '1px solid #e2e8f0',
              borderLeft: isDiff ? `4px solid ${diffColor}` : '4px solid transparent',
              opacity: rowOpacity,
              transform: `translateY(${rowY}px) scale(${rowScale})`,
              flex: 1,
            }}>
              <div style={{
                padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8,
              }}>
                {isDiff && (
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%', backgroundColor: diffColor, flexShrink: 0,
                  }} />
                )}
                <span style={{
                  fontSize: 13, fontWeight: isDiff ? 700 : 500,
                  color: isDiff ? '#1e293b' : '#64748b',
                }}>
                  {row.label}
                </span>
              </div>
              {row.values.map((val, ci) => (
                <div key={ci} style={{
                  padding: '12px 8px', textAlign: 'center',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{
                    fontSize: 13, fontWeight: isDiff ? 700 : 400,
                    color: isDiff ? diffColor : '#94a3b8',
                    backgroundColor: isDiff ? `${diffColor}15` : 'transparent',
                    padding: isDiff ? '3px 10px' : '0',
                    borderRadius: isDiff ? 999 : 0,
                  }}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12,
        opacity: interpolate(spring({ frame: Math.max(0, f - 90), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default DiffHighlightComp;
