// ============================================================
// 8: 推奨ハイライト型 — RecommendComp.tsx
// アニメーション: 全列スケール0→1 → 推奨列が大きく浮き上がり + 枠強調
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { RecommendProps } from './types';

const DEFAULT_OPTIONS = [
  {
    label: 'A案',
    color: '#64748b',
    badge: '次点',
    isRecommended: false,
    points: ['PBR 割安', '配当 3.2%', '成長性 ★★☆', '金利耐性 高'],
  },
  {
    label: 'B案（推奨）',
    color: '#2563eb',
    badge: '最推奨',
    isRecommended: true,
    points: ['PBR 最割安', '配当 3.5%', '成長性 ★★★', '金利耐性 最高', 'ROE改善中'],
  },
  {
    label: 'C案',
    color: '#64748b',
    badge: '参考',
    isRecommended: false,
    points: ['PBR 割安', '配当 2.8%', '成長性 ★★★', '金利感応 低'],
  },
];

export const RecommendComp: React.FC<RecommendProps> = ({
  title = '投資判断：おすすめ銘柄の決め方',
  options = DEFAULT_OPTIONS,
  usage = 'おすすめ提示・意思決定の後押し',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const titleP = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });

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
        opacity: interpolate(titleP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleP, [0, 1], [-14, 0])}px)`,
        marginBottom: 28,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · 推奨ハイライト型
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{title}</div>
      </div>

      {/* Cards */}
      <div style={{ flex: 1, display: 'flex', gap: 20, alignItems: 'center' }}>
        {options.map((opt, i) => {
          const cardDelay = 12 + i * 10;
          const cp = spring({ frame: Math.max(0, f - cardDelay), fps, config: { damping: 14, stiffness: 130 } });
          const cardScale = interpolate(cp, [0, 1], [0, opt.isRecommended ? 1.06 : 1]);
          const cardOpacity = interpolate(cp, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });
          const cardY = interpolate(cp, [0, 1], [opt.isRecommended ? -20 : 10, 0]);

          return (
            <div key={i} style={{
              flex: opt.isRecommended ? 1.25 : 1,
              opacity: cardOpacity,
              transform: `scale(${cardScale}) translateY(${cardY}px)`,
              transformOrigin: 'center center',
              position: 'relative',
            }}>
              {/* Recommended glow */}
              {opt.isRecommended && (
                <div style={{
                  position: 'absolute', inset: -3,
                  borderRadius: 24,
                  background: `linear-gradient(135deg, ${opt.color}, #7c3aed)`,
                  zIndex: 0,
                  boxShadow: `0 0 40px ${opt.color}66`,
                }} />
              )}

              <div style={{
                position: 'relative', zIndex: 1,
                backgroundColor: opt.isRecommended ? '#ffffff' : '#ffffff',
                borderRadius: 20,
                border: opt.isRecommended ? `2px solid ${opt.color}` : '2px solid #e2e8f0',
                boxShadow: opt.isRecommended
                  ? `0 20px 60px ${opt.color}33`
                  : '0 4px 16px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                height: '100%',
                display: 'flex', flexDirection: 'column',
              }}>
                {/* Badge */}
                {opt.badge && (
                  <div style={{
                    position: 'absolute', top: 14, right: 14,
                    backgroundColor: opt.isRecommended ? opt.color : '#94a3b8',
                    color: '#fff',
                    fontSize: 10, fontWeight: 800,
                    padding: '3px 10px', borderRadius: 999,
                    letterSpacing: '0.08em',
                    opacity: interpolate(
                      spring({ frame: Math.max(0, f - cardDelay - 15), fps, config: { damping: 12, stiffness: 200 } }),
                      [0, 1], [0, 1]
                    ),
                    transform: `scale(${interpolate(
                      spring({ frame: Math.max(0, f - cardDelay - 15), fps, config: { damping: 12, stiffness: 200 } }),
                      [0, 1], [0, 1]
                    )})`,
                    transformOrigin: 'top right',
                  }}>
                    {opt.badge}
                  </div>
                )}

                {/* Header */}
                <div style={{
                  background: opt.isRecommended
                    ? `linear-gradient(135deg, ${opt.color} 0%, #7c3aed 100%)`
                    : '#f1f5f9',
                  padding: `${opt.isRecommended ? 24 : 18}px 22px`,
                }}>
                  <div style={{
                    fontSize: opt.isRecommended ? 22 : 17,
                    fontWeight: 800,
                    color: opt.isRecommended ? '#fff' : '#64748b',
                  }}>
                    {opt.label}
                  </div>
                  {opt.isRecommended && (
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
                      ★ 最もバランスの取れた選択肢
                    </div>
                  )}
                </div>

                {/* Points */}
                <div style={{ padding: '16px 22px', flex: 1 }}>
                  {opt.points.map((pt, j) => {
                    const pp = spring({ frame: Math.max(0, f - cardDelay - 18 - j * 8), fps, config: { damping: 20, stiffness: 110 } });
                    return (
                      <div key={j} style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 10,
                        opacity: interpolate(pp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                        transform: `translateX(${interpolate(pp, [0, 1], [-8, 0])}px)`,
                      }}>
                        <div style={{
                          width: 6, height: 6, borderRadius: '50%',
                          backgroundColor: opt.isRecommended ? opt.color : '#cbd5e1',
                          flexShrink: 0,
                        }} />
                        <span style={{
                          fontSize: opt.isRecommended ? 13 : 12,
                          color: opt.isRecommended ? '#1e293b' : '#64748b',
                          fontWeight: opt.isRecommended ? 600 : 400,
                        }}>
                          {pt}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom bar */}
                <div style={{
                  height: opt.isRecommended ? 6 : 3,
                  background: opt.isRecommended
                    ? `linear-gradient(90deg, ${opt.color} 0%, #7c3aed 100%)`
                    : '#e2e8f0',
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div style={{
        marginTop: 16,
        opacity: interpolate(spring({ frame: Math.max(0, f - 70), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default RecommendComp;
