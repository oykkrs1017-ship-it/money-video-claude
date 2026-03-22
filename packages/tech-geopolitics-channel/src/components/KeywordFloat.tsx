import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

interface KeywordFloatProps {
  text: string;
  /** このキーワードを表示し始めるフレーム */
  startFrame: number;
  /** 表示し終わるフレーム */
  endFrame: number;
  /** 画面上のX位置 (0-100%) */
  x?: number;
  /** 画面上のY位置 (0-100%) */
  y?: number;
  color?: string;
  fontSize?: number;
}

export const KeywordFloat: React.FC<KeywordFloatProps> = ({
  text,
  startFrame,
  endFrame,
  x = 50,
  y = 40,
  color = '#ffdd44',
  fontSize = 48,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 表示範囲外はレンダリングしない
  if (frame < startFrame || frame > endFrame) return null;

  const localFrame = frame - startFrame;
  const duration = endFrame - startFrame;

  // フェードイン
  const fadeIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 20, stiffness: 200, mass: 0.8 },
  });

  // フェードアウト（終了10フレーム前から）
  const fadeOut = interpolate(
    frame,
    [endFrame - 10, endFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // 浮遊アニメーション（sinカーブで上下）
  const floatY = Math.sin(localFrame / fps * Math.PI * 1.2) * 6;

  // スケールポップイン
  const scale = interpolate(fadeIn, [0, 1], [0.6, 1]);

  const opacity = fadeIn * fadeOut;

  return (
    <div
      style={{
        position: 'absolute',
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, -50%) translateY(${floatY}px) scale(${scale})`,
        opacity,
        pointerEvents: 'none',
        zIndex: 10,
      }}
    >
      {/* 袋文字風の影 */}
      <div
        style={{
          position: 'relative',
          fontSize,
          fontWeight: 900,
          color,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          textShadow: [
            '-2px -2px 0 rgba(0,0,0,0.8)',
            '2px -2px 0 rgba(0,0,0,0.8)',
            '-2px 2px 0 rgba(0,0,0,0.8)',
            '2px 2px 0 rgba(0,0,0,0.8)',
            '0 0 20px rgba(255,221,68,0.4)',
          ].join(', '),
        }}
      >
        {text}
      </div>
      {/* アンダーライン */}
      <div
        style={{
          height: 3,
          background: color,
          borderRadius: 2,
          marginTop: 4,
          transform: `scaleX(${fadeIn})`,
          transformOrigin: 'center',
          boxShadow: `0 0 8px ${color}`,
        }}
      />
    </div>
  );
};

export default KeywordFloat;
