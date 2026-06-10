// ============================================================
// 1: カード並列型 — CardList.tsx
// アニメーション: カード stagger spring-in → ポイント stagger fade-in
// ============================================================
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { CardListProps } from './types';

const DEFAULT_CARDS = [
  {
    label: '三菱UFJ',
    color: '#1e40af',
    emoji: '🏦',
    points: ['PBR 0.9倍（割安圏）', '配当利回り 3.2%', '金利1%上昇で利益+1,500億円'],
  },
  {
    label: '東京海上',
    color: '#0d9488',
    emoji: '🛡️',
    points: ['ROE 15%超・業界最高水準', '自社株買いで還元強化', '円安が収益の追い風に'],
  },
  {
    label: '三菱商事',
    color: '#d97706',
    emoji: '⚡',
    points: ['資源高で3期連続最高益', 'PBR 0.8倍の超割安水準', '株主還元方針を上方修正'],
  },
];

export const CardList: React.FC<CardListProps> = ({
  title = '出遅れバリュー株 3選',
  subtitle = '金利上昇局面で恩恵を受けるセクター',
  cards = DEFAULT_CARDS,
  usage = '銘柄の特性比較・セクター別一覧',
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
      background: 'linear-gradient(160deg, #f8fafc 0%, #f0f4ff 100%)',
      fontFamily: '"Noto Sans JP", "Hiragino Sans", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        opacity: interpolate(titleP, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(titleP, [0, 1], [-16, 0])}px)`,
        marginBottom: 28,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', letterSpacing: '0.12em', marginBottom: 6 }}>
          COMPARISON · カード並列型
        </div>
        <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b', lineHeight: 1.3 }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>{subtitle}</div>
        )}
      </div>

      {/* Cards */}
      <div style={{ display: 'flex', gap: 20, flex: 1, alignItems: 'stretch' }}>
        {cards.map((card, i) => {
          const cf = Math.max(0, f - 8 - i * 10);
          const cp = spring({ frame: cf, fps, config: { damping: 16, stiffness: 130 } });
          const cardY = interpolate(cp, [0, 1], [50, 0]);
          const cardOpacity = interpolate(cp, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });

          return (
            <div key={i} style={{
              flex: 1,
              opacity: cardOpacity,
              transform: `translateY(${cardY}px)`,
              backgroundColor: '#ffffff',
              borderRadius: 20,
              boxShadow: '0 8px 32px rgba(0,0,0,0.10)',
              border: `2px solid ${card.color}33`,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}>
              {/* Card header */}
              <div style={{
                background: `linear-gradient(135deg, ${card.color} 0%, ${card.color}cc 100%)`,
                padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: 32 }}>{card.emoji}</span>
                <div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em', marginBottom: 2 }}>
                    {`案 ${String.fromCharCode(65 + i)}`}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{card.label}</div>
                </div>
              </div>

              {/* Points */}
              <div style={{ padding: '20px 24px', flex: 1 }}>
                {card.points.map((pt, j) => {
                  const pf = Math.max(0, f - 20 - i * 10 - j * 7);
                  const pp = spring({ frame: pf, fps, config: { damping: 20, stiffness: 110 } });
                  return (
                    <div key={j} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      marginBottom: 12,
                      opacity: interpolate(pp, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
                      transform: `translateX(${interpolate(pp, [0, 1], [-12, 0])}px)`,
                    }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%',
                        backgroundColor: card.color, flexShrink: 0, marginTop: 5,
                      }} />
                      <span style={{ fontSize: 13, color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>{pt}</span>
                    </div>
                  );
                })}
              </div>

              {/* Bottom accent */}
              <div style={{
                height: 4,
                background: `linear-gradient(90deg, ${card.color} 0%, ${card.color}55 100%)`,
              }} />
            </div>
          );
        })}
      </div>

      {/* Usage footer */}
      <div style={{
        marginTop: 14,
        opacity: interpolate(spring({ frame: Math.max(0, f - 60), fps }), [0, 1], [0, 1]),
        fontSize: 11, color: '#94a3b8', textAlign: 'right',
      }}>
        向いている内容：{usage}
      </div>
    </div>
  );
};

export default CardList;
