// ============================================================
// 2: 比較表型 — CompTableComp.tsx
// アニメーション: 外枠→ヘッダー→行 stagger→アイコン pop
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { CompTableProps, EvalIcon } from './types';

const EVAL_STYLE: Record<EvalIcon, { bg: string; color: string; label: string }> = {
  '◎': { bg: '#dcfce7', color: '#16a34a', label: '◎' },
  '○': { bg: '#dbeafe', color: '#2563eb', label: '○' },
  '△': { bg: '#fef9c3', color: '#ca8a04', label: '△' },
  '✕': { bg: '#fee2e2', color: '#dc2626', label: '✕' },
};

const DEFAULT_COLS = [
  { label: '三菱UFJ', color: '#1e40af' },
  { label: '東京海上', color: '#0d9488' },
  { label: '三菱商事', color: '#d97706' },
];
const DEFAULT_ROWS = [
  { label: '割安度（PBR）', values: ['◎', '○', '◎'] as EvalIcon[] },
  { label: '収益性（ROE）', values: ['○', '◎', '◎'] as EvalIcon[] },
  { label: '配当利回り', values: ['◎', '△', '○'] as EvalIcon[] },
  { label: '金利上昇耐性', values: ['◎', '○', '△'] as EvalIcon[] },
  { label: '成長期待', values: ['○', '◎', '○'] as EvalIcon[] },
];

export const CompTableComp: React.FC<CompTableProps> = ({
  title = 'セクター別 評価マトリクス',
  columns = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
  usage = '機能・条件・スペック比較',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  // 外枠のスケールイン
  const wrapP = spring({ frame: f, fps, config: { damping: 18, stiffness: 100 } });
  const wrapScale = interpolate(wrapP, [0, 1], [0.92, 1]);
  const wrapOpacity = interpolate(wrapP, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

  const colCount = columns.length;
  const gridCols = `1.8fr ${Array(colCount).fill('1fr').join(' ')}`;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '36px 44px', boxSizing: 'border-box',
      background: 'linear-gradient(160deg, #f8fafc 0%, #eff6ff 100%)',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    }}>
      {/* Title */}
      <div style={{
        opacity: wrapOpacity,
        transform: `translateY(${interpolate(wrapP, [0, 1], [-14, 0])}px)`,
        marginBottom: 24,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · 比較表型
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{title}</div>
      </div>

      {/* Table */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: 20,
        boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        opacity: wrapOpacity,
        transform: `scale(${wrapScale})`,
        transformOrigin: 'center center',
      }}>
        {/* Header row */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          backgroundColor: '#1e293b',
        }}>
          <div style={{ padding: '14px 20px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>評価項目</div>
          {columns.map((col, i) => {
            const hp = spring({ frame: Math.max(0, f - 10 - i * 6), fps, config: { damping: 18, stiffness: 120 } });
            return (
              <div key={i} style={{
                padding: '14px 12px', textAlign: 'center',
                opacity: interpolate(hp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(hp, [0, 1], [-10, 0])}px)`,
              }}>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: col.color ?? '#6366f1',
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  padding: '4px 14px', borderRadius: 999,
                }}>
                  {col.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Data rows */}
        {rows.map((row, ri) => {
          const rowDelay = 20 + ri * 10;
          const rp = spring({ frame: Math.max(0, f - rowDelay), fps, config: { damping: 20, stiffness: 110 } });
          const rowOpacity = interpolate(rp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
          const rowY = interpolate(rp, [0, 1], [16, 0]);

          return (
            <div key={ri} style={{
              display: 'grid', gridTemplateColumns: gridCols,
              backgroundColor: ri % 2 === 0 ? '#ffffff' : '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              opacity: rowOpacity,
              transform: `translateY(${rowY}px)`,
              flex: 1,
            }}>
              <div style={{
                padding: '14px 20px',
                display: 'flex', alignItems: 'center',
                fontSize: 13, color: '#374151', fontWeight: 600,
              }}>
                {row.label}
              </div>
              {row.values.map((val, ci) => {
                const iconDelay = rowDelay + 12 + ci * 4;
                const ip = spring({ frame: Math.max(0, f - iconDelay), fps, config: { damping: 14, stiffness: 200 } });
                const iconScale = interpolate(ip, [0, 1], [0, 1]);
                const evalS = EVAL_STYLE[val] ?? EVAL_STYLE['△'];
                return (
                  <div key={ci} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transform: `scale(${iconScale})`,
                  }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%',
                      backgroundColor: evalS.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: evalS.color, fontWeight: 700,
                      boxShadow: `0 2px 8px ${evalS.color}44`,
                    }}>
                      {evalS.label}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 12,
        opacity: interpolate(spring({ frame: Math.max(0, f - 80), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default CompTableComp;
