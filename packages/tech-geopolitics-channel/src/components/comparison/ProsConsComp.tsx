// ============================================================
// 5: 長所・短所対比型 — ProsConsComp.tsx
// アニメーション: 左パネル←スライド / 右パネル→スライド → 行 stagger
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { ProsConsProps } from './types';

const DEFAULT_PROS = [
  { text: 'PBR 0.9倍と割安圏、ROE改善中' },
  { text: '日銀利上げで純利息収入が拡大' },
  { text: '3期連続増配、配当利回り3.2%' },
  { text: 'アジア事業の成長で海外収益拡大中' },
];
const DEFAULT_CONS = [
  { text: '国内貸出の不良債権リスク残存' },
  { text: '海外信用リスクのエクスポージャー' },
  { text: '金利低下局面での収益圧迫' },
  { text: 'デジタルバンクとの競争激化' },
];

export const ProsConsComp: React.FC<ProsConsProps> = ({
  title = '三菱UFJ：投資判断の整理',
  subject = '三菱UFJフィナンシャル・グループ',
  pros = DEFAULT_PROS,
  cons = DEFAULT_CONS,
  usage = '意思決定材料・長所短所の整理',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = Math.max(0, frame - startFrame);

  const titleP = spring({ frame: f, fps, config: { damping: 22, stiffness: 90 } });

  const leftP = spring({ frame: Math.max(0, f - 10), fps, config: { damping: 18, stiffness: 100 } });
  const rightP = spring({ frame: Math.max(0, f - 14), fps, config: { damping: 18, stiffness: 100 } });

  const leftX = interpolate(leftP, [0, 1], [-60, 0]);
  const rightX = interpolate(rightP, [0, 1], [60, 0]);
  const panelOpacity = (p: number) => interpolate(p, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <div style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      padding: '36px 44px', boxSizing: 'border-box',
      background: 'linear-gradient(160deg, #f8fafc 0%, #f5f3ff 100%)',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    }}>
      {/* Title */}
      <div style={{
        opacity: interpolate(titleP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleP, [0, 1], [-14, 0])}px)`,
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · 長所・短所対比型
        </div>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{title}</div>
        {subject && (
          <div style={{
            display: 'inline-block', marginTop: 6,
            fontSize: 12, color: '#6366f1', fontWeight: 600,
            backgroundColor: '#ede9fe', padding: '3px 12px', borderRadius: 999,
          }}>
            {subject}
          </div>
        )}
      </div>

      {/* Two panels */}
      <div style={{ flex: 1, display: 'flex', gap: 20 }}>
        {/* Pros panel */}
        <div style={{
          flex: 1,
          opacity: panelOpacity(leftP),
          transform: `translateX(${leftX}px)`,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '2px solid #86efac',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
            padding: '16px 22px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 24 }}>✅</span>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em' }}>PROS</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>長所・買い材料</div>
            </div>
          </div>
          <div style={{ padding: '16px 22px', flex: 1 }}>
            {pros.map((item, i) => {
              const ip = spring({ frame: Math.max(0, f - 24 - i * 8), fps, config: { damping: 20, stiffness: 110 } });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: 12,
                  opacity: interpolate(ip, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                  transform: `translateX(${interpolate(ip, [0, 1], [-12, 0])}px)`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    backgroundColor: '#dcfce7', border: '2px solid #16a34a',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 12, color: '#16a34a', fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: '#166534', lineHeight: 1.5, fontWeight: 500 }}>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cons panel */}
        <div style={{
          flex: 1,
          opacity: panelOpacity(rightP),
          transform: `translateX(${rightX}px)`,
          backgroundColor: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
          border: '2px solid #fca5a5',
          overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
            padding: '16px 22px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em' }}>CONS</div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff' }}>短所・リスク要因</div>
            </div>
          </div>
          <div style={{ padding: '16px 22px', flex: 1 }}>
            {cons.map((item, i) => {
              const ip = spring({ frame: Math.max(0, f - 28 - i * 8), fps, config: { damping: 20, stiffness: 110 } });
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  marginBottom: 12,
                  opacity: interpolate(ip, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                  transform: `translateX(${interpolate(ip, [0, 1], [12, 0])}px)`,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    backgroundColor: '#fee2e2', border: '2px solid #dc2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0, fontSize: 12, color: '#dc2626', fontWeight: 700,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.5, fontWeight: 500 }}>{item.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 12,
        opacity: interpolate(spring({ frame: Math.max(0, f - 70), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default ProsConsComp;
