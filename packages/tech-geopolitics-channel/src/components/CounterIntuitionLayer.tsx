import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface CounterIntuitionLayerProps {
  /** 表示を開始するフレーム（通常は0） */
  startFrame?: number;
  /** フェードアウト完了フレーム（デフォルト fps*15=15秒） */
  endFrame?: number;
  accentColor?: string;
}

/**
 * Hook冒頭15秒の「逆説層」演出コンポーネント（H-05ルール対応）
 *
 * 考えすぎる葦チャンネル分析（333k再生）に基づき、冒頭15秒で
 * 「え、なんで？」を引き出す逆説フックを視覚的に演出する。
 *
 * - 画面下部に脈動する「？」マークと「逆説フック層」バッジを表示
 * - 画面四隅に淡いグロー効果を追加して「疑問の空気感」を演出
 * - 既存コンポーネントを上書きせず、zIndex=25で重ねる
 * - script側にH-05対応のセリフが無い場合（旧ep003〜ep016）は
 *   isActive=false で渡すと何もレンダリングしない（後方互換）
 */
export const CounterIntuitionLayer: React.FC<CounterIntuitionLayerProps & { isActive?: boolean }> = ({
  startFrame = 0,
  endFrame,
  accentColor = '#f59e0b',
  isActive = false,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const end = endFrame ?? fps * 15;

  // 後方互換: isActive=false の場合は何も描画しない
  if (!isActive) return null;

  const localFrame = frame - startFrame;
  if (localFrame < 0 || frame >= end) return null;

  // フェードイン（0〜0.5秒）
  const fadeIn = interpolate(localFrame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' });

  // フェードアウト（13〜15秒）
  const fadeOut = interpolate(frame, [end - fps * 2, end], [1, 0], { extrapolateRight: 'clamp' });

  const opacity = Math.min(fadeIn, fadeOut);

  // 「？」マークの脈動（2秒周期）
  const pulseFrame = localFrame % (fps * 2);
  const pulseScale = interpolate(pulseFrame, [0, fps, fps * 2], [1, 1.15, 1], { extrapolateRight: 'clamp' });
  const pulseOpacity = interpolate(pulseFrame, [0, fps, fps * 2], [0.7, 1, 0.7], { extrapolateRight: 'clamp' });

  // バッジのスライドイン
  const badgeSlide = spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 120 } });
  const badgeX = interpolate(badgeSlide, [0, 1], [-200, 0]);

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 25, pointerEvents: 'none' }}>
      {/* 四隅グロー（疑問の空気感） */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse at top left, ${accentColor}22 0%, transparent 50%),
                     radial-gradient(ellipse at bottom right, ${accentColor}18 0%, transparent 50%)`,
        opacity,
      }} />

      {/* 左下: 逆説フックバッジ */}
      <div style={{
        position: 'absolute',
        bottom: height * 0.12,
        left: 40,
        opacity,
        transform: `translateX(${badgeX}px)`,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        {/* 「？」マーク */}
        <div style={{
          width: 52,
          height: 52,
          borderRadius: '50%',
          backgroundColor: accentColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${pulseScale})`,
          opacity: pulseOpacity,
          boxShadow: `0 0 20px ${accentColor}88`,
        }}>
          <span style={{ color: '#000', fontSize: 30, fontWeight: 900, lineHeight: 1 }}>?</span>
        </div>

        {/* バッジテキスト */}
        <div style={{
          backgroundColor: 'rgba(0,0,0,0.72)',
          border: `1.5px solid ${accentColor}88`,
          borderRadius: 8,
          padding: '6px 14px',
        }}>
          <span style={{
            color: accentColor,
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textShadow: `0 0 12px ${accentColor}`,
          }}>
            COUNTER-INTUITION
          </span>
        </div>
      </div>

      {/* タイムバー（15秒カウントダウン） */}
      <div style={{
        position: 'absolute',
        bottom: height * 0.08,
        left: 40,
        right: 40,
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 2,
        opacity: opacity * 0.6,
      }}>
        <div style={{
          height: '100%',
          width: `${100 - (localFrame / (end - startFrame)) * 100}%`,
          backgroundColor: accentColor,
          borderRadius: 2,
          boxShadow: `0 0 8px ${accentColor}`,
          transition: 'width 0s',
        }} />
      </div>
    </div>
  );
};
