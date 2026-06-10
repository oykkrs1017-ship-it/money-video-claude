// ============================================================
// 6: スコアリング型 — ScoringComp.tsx
// アニメーション: 行が出現 → 数値カウントアップ → 合計行ハイライト
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { ScoringProps } from './types';

const DEFAULT_CRITERIA = [
  { label: '割安度（PBR）', maxScore: 5 },
  { label: '収益性（ROE）', maxScore: 5 },
  { label: '配当利回り', maxScore: 4 },
  { label: '金利耐性', maxScore: 3 },
  { label: '成長期待', maxScore: 3 },
];

const DEFAULT_OPTIONS = [
  { label: '三菱UFJ', color: '#2563eb', scores: [5, 3, 4, 3, 3] },
  { label: '東京海上', color: '#0d9488', scores: [3, 5, 3, 4, 4] },
  { label: '三菱商事', color: '#d97706', scores: [5, 4, 3, 2, 3] },
  { label: 'アドバンテスト', color: '#dc2626', scores: [1, 4, 1, 1, 5] },
];

export const ScoringComp: React.FC<ScoringProps> = ({
  title = '投資スコアリング評価表',
  criteria = DEFAULT_CRITERIA,
  options = DEFAULT_OPTIONS,
  usage = '定量評価・選定プロセス',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const titleP = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });

  const totals = options.map(o => o.scores.reduce((a, b) => a + b, 0));
  const maxTotal = Math.max(...totals);
  const maxPossible = criteria.reduce((a, c) => a + c.maxScore, 0);

  const gridCols = `2fr ${options.map(() => '1fr').join(' ')}`;

  // Total row animation delay
  const totalDelay = 20 + criteria.length * 12 + 20;

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '36px 44px', boxSizing: 'border-box',
      background: 'linear-gradient(160deg, #f8fafc 0%, #fff7ed 100%)',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    }}>
      {/* Title */}
      <div style={{
        opacity: interpolate(titleP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleP, [0, 1], [-14, 0])}px)`,
        marginBottom: 22,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · スコアリング型
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
        opacity: interpolate(titleP, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
      }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: gridCols, backgroundColor: '#1e293b' }}>
          <div style={{ padding: '12px 18px', fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>評価項目</div>
          {options.map((opt, i) => {
            const hp = spring({ frame: Math.max(0, f - 10 - i * 6), fps, config: { damping: 18, stiffness: 120 } });
            return (
              <div key={i} style={{
                padding: '12px 8px', textAlign: 'center',
                opacity: interpolate(hp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateY(${interpolate(hp, [0, 1], [-10, 0])}px)`,
              }}>
                <div style={{
                  display: 'inline-block',
                  backgroundColor: opt.color,
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  padding: '3px 12px', borderRadius: 999,
                }}>
                  {opt.label}
                </div>
              </div>
            );
          })}
        </div>

        {/* Criteria rows */}
        {criteria.map((crit, ri) => {
          const rowDelay = 18 + ri * 12;
          const rp = spring({ frame: Math.max(0, f - rowDelay), fps, config: { damping: 20, stiffness: 110 } });
          const rowOpacity = interpolate(rp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' });
          const rowY = interpolate(rp, [0, 1], [14, 0]);

          return (
            <div key={ri} style={{
              display: 'grid', gridTemplateColumns: gridCols,
              backgroundColor: ri % 2 === 0 ? '#ffffff' : '#f8fafc',
              borderBottom: '1px solid #e2e8f0',
              opacity: rowOpacity,
              transform: `translateY(${rowY}px)`,
              flex: 1,
            }}>
              <div style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{crit.label}</span>
                <span style={{
                  fontSize: 10, color: '#94a3b8', backgroundColor: '#f1f5f9',
                  padding: '1px 6px', borderRadius: 999,
                }}>/{crit.maxScore}</span>
              </div>
              {options.map((opt, ci) => {
                const score = opt.scores[ri];
                const cellDelay = rowDelay + 10 + ci * 5;
                const cp = spring({ frame: Math.max(0, f - cellDelay), fps, config: { damping: 20, stiffness: 100 } });
                const displayScore = Math.round(interpolate(cp, [0, 1], [0, score], { extrapolateRight: 'clamp' }));
                const ratio = score / crit.maxScore;

                return (
                  <div key={ci} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 4, padding: '8px 4px',
                  }}>
                    <div style={{
                      fontSize: 18, fontWeight: 800, color: opt.color,
                      opacity: interpolate(cp, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
                    }}>
                      {displayScore}
                    </div>
                    {/* Bar */}
                    <div style={{
                      width: '80%', height: 4, backgroundColor: '#e2e8f0', borderRadius: 999, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', backgroundColor: opt.color, borderRadius: 999,
                        width: `${ratio * 100 * interpolate(cp, [0, 1], [0, 1])}%`,
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}

        {/* Total row */}
        <div style={{
          display: 'grid', gridTemplateColumns: gridCols,
          backgroundColor: '#1e293b',
          opacity: interpolate(
            spring({ frame: Math.max(0, f - totalDelay), fps, config: { damping: 18, stiffness: 100 } }),
            [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }
          ),
        }}>
          <div style={{ padding: '14px 18px', fontSize: 13, color: '#f8fafc', fontWeight: 800 }}>
            合計 （/{maxPossible}）
          </div>
          {totals.map((total, i) => {
            const isMax = total === maxTotal;
            const tp = spring({ frame: Math.max(0, f - totalDelay - 8 - i * 6), fps, config: { damping: 14, stiffness: 180 } });
            const scale = interpolate(tp, [0, 1], [0, isMax ? 1.15 : 1]);
            const displayTotal = Math.round(
              interpolate(tp, [0, 1], [0, total], { extrapolateRight: 'clamp' })
            );
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transform: `scale(${scale})`,
              }}>
                <div style={{
                  fontSize: isMax ? 22 : 18,
                  fontWeight: 800,
                  color: isMax ? '#fbbf24' : options[i].color,
                  textShadow: isMax ? '0 0 20px rgba(251,191,36,0.5)' : 'none',
                }}>
                  {displayTotal}
                  {isMax && <span style={{ fontSize: 14, marginLeft: 4 }}>🏆</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{
        marginTop: 12,
        opacity: interpolate(spring({ frame: Math.max(0, f - 100), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default ScoringComp;
