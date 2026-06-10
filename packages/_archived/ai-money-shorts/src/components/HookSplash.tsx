import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { DESIGN } from '../styles/designSystem';

/** フック冒頭スプラッシュ（全タイプ共通） */
export const HOOK_SPLASH_DURATION = 60; // 2秒

interface HookSplashProps {
  /** エピソードタイトル or フックテキスト */
  text: string;
}

export const HookSplash: React.FC<HookSplashProps> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // ── 白フラッシュ（frame 0-12）
  const flashOpacity = interpolate(frame, [0, 4, 12], [1, 0.7, 0], {
    extrapolateRight: 'clamp',
  });

  // ── オーバーレイ全体フェード（in: 0-6, out: 45-60）
  const overlayOpacity =
    frame <= 6
      ? interpolate(frame, [0, 6], [0, 1], { extrapolateLeft: 'clamp' })
      : interpolate(frame, [45, HOOK_SPLASH_DURATION], [1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });

  // ── テキスト スプリングスケール（overshoot あり）
  const scale = spring({
    frame,
    fps,
    config: { damping: 8, stiffness: 300, mass: 0.8 },
  });

  // ── 入場時シェイク（frame 0-18）
  const shakeDecay = interpolate(frame, [0, 18], [1, 0], {
    extrapolateRight: 'clamp',
  });
  const shakeX = Math.sin(frame * 2.3) * 8 * shakeDecay;
  const shakeY = Math.cos(frame * 1.7) * 5 * shakeDecay;

  // ── グロー脈動（sin波）
  const glow = 45 + 25 * Math.sin(frame * 0.22);

  // ── アクセントラインの伸び（scale と連動）
  const lineWidth = interpolate(scale, [0, 1], [0, 680], {
    extrapolateRight: 'clamp',
  });

  return (
    <>
      {/* 暗幕オーバーレイ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0,0,0,0.82)',
          opacity: overlayOpacity,
          zIndex: 200,
        }}
      />

      {/* 白フラッシュ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: '#ffffff',
          opacity: flashOpacity,
          zIndex: 201,
        }}
      />

      {/* メインコンテンツ */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: `translate(-50%, -50%) translateX(${shakeX}px) translateY(${shakeY}px)`,
          opacity: overlayOpacity,
          zIndex: 202,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
          width: '88%',
          textAlign: 'center',
        }}
      >
        {/* 上アクセントライン */}
        <div
          style={{
            width: lineWidth,
            height: 4,
            background: `linear-gradient(to right, transparent, ${DESIGN.colors.accentGold}, transparent)`,
            borderRadius: 2,
          }}
        />

        {/* ⚡ アイコン */}
        <div
          style={{
            fontSize: 72,
            transform: `scale(${scale})`,
            filter: `drop-shadow(0 0 16px ${DESIGN.colors.accentGold})`,
            lineHeight: 1,
          }}
        >
          ⚡
        </div>

        {/* メインテキスト */}
        <div
          style={{
            fontFamily: DESIGN.fonts.heading,
            fontSize: 88,
            fontWeight: 900,
            color: DESIGN.colors.accentGold,
            lineHeight: 1.25,
            transform: `scale(${scale})`,
            textShadow: [
              `0 0 ${glow}px ${DESIGN.colors.accentGold}`,
              `0 0 ${glow * 2}px ${DESIGN.colors.accentGold}60`,
              '4px 4px 0 rgba(0,0,0,0.9)',
              '-2px 2px 0 rgba(0,0,0,0.9)',
              '2px -2px 0 rgba(0,0,0,0.9)',
            ].join(', '),
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
          }}
        >
          {text}
        </div>

        {/* 下アクセントライン */}
        <div
          style={{
            width: lineWidth,
            height: 4,
            background: `linear-gradient(to right, transparent, ${DESIGN.colors.accentGold}, transparent)`,
            borderRadius: 2,
          }}
        />

        {/* 「続きを見て」バッジ */}
        <div
          style={{
            marginTop: 8,
            background: DESIGN.colors.accentGold,
            color: '#000',
            fontFamily: DESIGN.fonts.heading,
            fontSize: 28,
            fontWeight: 900,
            padding: '8px 32px',
            borderRadius: 40,
            opacity: interpolate(frame, [20, 32], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `scale(${interpolate(frame, [20, 32], [0.7, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`,
            letterSpacing: 2,
          }}
        >
          👆 最後まで見て！
        </div>
      </div>
    </>
  );
};
