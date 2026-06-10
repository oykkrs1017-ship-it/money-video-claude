import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { DESIGN } from '../styles/designSystem';

interface CTAProps {
  variant?: 'full' | 'mini';
}

export const CTA: React.FC<CTAProps> = ({ variant = 'full' }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const appear = spring({ frame, fps, config: { damping: 12, stiffness: 150 } });

  if (variant === 'mini') {
    return <MiniCTA frame={frame} fps={fps} appear={appear} />;
  }

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 200,
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 24,
        transform: `translateY(${(1 - appear) * 80}px)`,
        opacity: appear,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: 32,
          alignItems: 'center',
        }}
      >
        {/* チャンネル登録アイコン */}
        <div style={{ textAlign: 'center' }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" fill={DESIGN.colors.accentPink} opacity="0.9" />
            <polygon points="28,22 28,50 54,36" fill="white" />
          </svg>
          <div
            style={{
              color: DESIGN.colors.textWhite,
              fontSize: 18,
              fontWeight: 700,
              marginTop: 8,
              fontFamily: DESIGN.fonts.body,
            }}
          >
            フォロー
          </div>
        </div>

        {/* いいねアイコン */}
        <div style={{ textAlign: 'center' }}>
          <svg width={72} height={72} viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="34" fill={DESIGN.colors.accentGold} opacity="0.9" />
            <text x="36" y="44" textAnchor="middle" fontSize="28">
              👍
            </text>
          </svg>
          <div
            style={{
              color: DESIGN.colors.textWhite,
              fontSize: 18,
              fontWeight: 700,
              marginTop: 8,
              fontFamily: DESIGN.fonts.body,
            }}
          >
            いいね
          </div>
        </div>
      </div>

      <div
        style={{
          fontFamily: DESIGN.fonts.heading,
          fontSize: 32,
          fontWeight: 900,
          color: DESIGN.colors.accentGold,
          textShadow: `0 0 20px ${DESIGN.colors.accentGold}60`,
          textAlign: 'center',
        }}
      >
        フォローして毎日お届け！
      </div>

      <div
        style={{
          fontFamily: DESIGN.fonts.heading,
          fontSize: 22,
          color: DESIGN.colors.textGray,
          textAlign: 'center',
        }}
      >
        AIマネー研究所
      </div>
    </div>
  );
};

/** 中盤に表示する小さいフォロー促進バッジ */
const MiniCTA: React.FC<{ frame: number; fps: number; appear: number }> = ({
  frame,
  fps,
  appear,
}) => {
  // 3秒後にフェードアウト
  const fadeOutStart = fps * 7;
  const fadeOut = interpolate(frame, [fadeOutStart, fadeOutStart + fps], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // パルスアニメーション
  const pulse = 1 + Math.sin(frame * 0.15) * 0.04;

  return (
    <div
      style={{
        position: 'absolute',
        top: 160,
        right: 24,
        opacity: appear * fadeOut,
        transform: `translateX(${(1 - appear) * 60}px) scale(${pulse})`,
      }}
    >
      <div
        style={{
          background: `linear-gradient(135deg, ${DESIGN.colors.accentPink}, #c0392b)`,
          borderRadius: 20,
          padding: '10px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: `0 0 20px ${DESIGN.colors.accentPink}60`,
        }}
      >
        <svg width={28} height={28} viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="13" fill="white" opacity="0.95" />
          <polygon points="10,8 10,20 22,14" fill={DESIGN.colors.accentPink} />
        </svg>
        <div
          style={{
            fontFamily: DESIGN.fonts.body,
            fontSize: 20,
            fontWeight: 900,
            color: DESIGN.colors.textWhite,
            whiteSpace: 'nowrap',
          }}
        >
          フォロー
        </div>
      </div>
      <div
        style={{
          fontFamily: DESIGN.fonts.body,
          fontSize: 14,
          color: DESIGN.colors.textGray,
          textAlign: 'center',
          marginTop: 4,
        }}
      >
        毎日更新中
      </div>
    </div>
  );
};
