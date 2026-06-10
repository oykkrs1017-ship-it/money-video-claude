import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';

export type ImagePosition = 'top-left' | 'top-right' | 'top-center' | 'center-right' | 'center';
export type ImageAnimation = 'fade' | 'slide-right' | 'slide-left' | 'zoom';

export interface ImageData {
  /** public/ からの相対パス（例: "content/map_taiwan.png"） */
  src: string;
  alt?: string;
  /** 画像下部に表示するキャプション */
  caption?: string;
  /** 画面内の配置位置 デフォルト: top-right */
  position?: ImagePosition;
  /** 表示幅 (px) デフォルト: 340 */
  width?: number;
  /** 表示秒数 デフォルト: 8 */
  duration?: number;
  /** 登場アニメーション デフォルト: position に応じて自動選択 */
  animation?: ImageAnimation;
}

interface ImageOverlayProps {
  imageData: ImageData;
  startFrame: number;
  endFrame: number;
  accentColor?: string;
}

export const ImageOverlay: React.FC<ImageOverlayProps> = ({
  imageData,
  startFrame,
  endFrame,
  accentColor = '#4a9eff',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  const localFrame = frame - startFrame;

  // デフォルトアニメーション: position に合わせて自動選択
  const resolveAnimation = (): ImageAnimation => {
    if (imageData.animation) return imageData.animation;
    switch (imageData.position ?? 'top-right') {
      case 'top-left':    return 'slide-right';
      case 'top-right':   return 'slide-left';
      case 'center-right': return 'slide-left';
      case 'top-center':
      case 'center':
      default:            return 'zoom';
    }
  };

  const animation = resolveAnimation();

  // フェードイン (spring)
  const springProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 22, stiffness: 200, mass: 0.9 },
  });

  // フェードアウト（末尾 0.6 秒）
  const fadeOut = interpolate(
    frame,
    [endFrame - fps * 0.6, endFrame],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  const opacity = Math.min(springProgress, fadeOut);

  // アニメーション別トランスフォーム
  let translateX = 0;
  let translateY = 0;
  let scale = 1;

  if (animation === 'slide-right') {
    translateX = interpolate(springProgress, [0, 1], [-70, 0]);
  } else if (animation === 'slide-left') {
    translateX = interpolate(springProgress, [0, 1], [70, 0]);
  } else if (animation === 'zoom') {
    scale = interpolate(springProgress, [0, 1], [0.78, 1]);
    translateY = interpolate(springProgress, [0, 1], [10, 0]);
  }

  // ─── Ken Burns: 継続的なゆっくりズーム+パン ─────────────
  // fade アニメーション時はKen Burnsを無効化（余白ずれ防止）
  const enableKenBurns = animation !== 'fade';
  const totalFrames = Math.max(endFrame - startFrame, 1);
  const kbProgress = enableKenBurns
    ? interpolate(localFrame, [0, totalFrames], [0, 1], { extrapolateRight: 'clamp' })
    : 0;
  // src ハッシュでパン方向をバラつかせる（同じ方向にならないように）
  const srcHash = (imageData.src ?? '')
    .split('')
    .reduce((acc, c) => ((acc * 31 + c.charCodeAt(0)) | 0), 0);
  const kbDirX = srcHash % 2 === 0 ? 1 : -1;
  const kbDirY = (Math.floor(Math.abs(srcHash) / 2)) % 2 === 0 ? 1 : -1;
  const kbScale = enableKenBurns ? interpolate(kbProgress, [0, 1], [1.0, 1.07]) : 1;
  const kbPanX  = enableKenBurns ? interpolate(kbProgress, [0, 1], [0, kbDirX * 22]) : 0;
  const kbPanY  = enableKenBurns ? interpolate(kbProgress, [0, 1], [0, kbDirY * 13]) : 0;

  // 配置
  const imgWidth = imageData.width ?? 1280;
  const position = imageData.position ?? 'top-right';

  const positionStyle: React.CSSProperties = (() => {
    switch (position) {
      case 'top-left':     return { top: '8%', left: '3%' };
      case 'top-center':   return { top: '6%', left: '50%', marginLeft: -(imgWidth / 2) };
      case 'center-right': return { top: '25%', right: '3%' };
      case 'center':       return { top: '10%', left: '50%', marginLeft: -(imgWidth / 2) };
      case 'top-right':
      default:             return { top: '8%', right: '3%' };
    }
  })();

  return (
    <div
      style={{
        position: 'absolute',
        width: imgWidth,
        zIndex: 40,
        opacity,
        transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
        ...positionStyle,
      }}
    >
      {/* 画像本体 */}
      <div
        style={{
          borderRadius: 10,
          overflow: 'hidden',
          border: `2px solid rgba(255,255,255,0.45)`,
          boxShadow: `0 8px 36px rgba(0,0,0,0.7), 0 0 0 1px ${accentColor}66, 0 0 20px ${accentColor}33`,
        }}
      >
        <Img
          src={staticFile(imageData.src)}
          alt={imageData.alt ?? ''}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            objectFit: 'cover',
            filter: 'brightness(1.25) contrast(1.08) saturate(1.1)',
            transform: `scale(${kbScale}) translate(${kbPanX}px, ${kbPanY}px)`,
            transformOrigin: 'center center',
            willChange: 'transform',
          }}
        />
      </div>

      {/* キャプション */}
      {imageData.caption && (
        <div
          style={{
            marginTop: 6,
            backgroundColor: 'rgba(0,0,0,0.72)',
            borderRadius: 6,
            padding: '5px 12px',
            textAlign: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span
            style={{
              color: '#ffffff',
              fontSize: 17,
              fontWeight: 600,
              letterSpacing: '0.03em',
              textShadow: '0 1px 4px rgba(0,0,0,0.9)',
            }}
          >
            {imageData.caption}
          </span>
        </div>
      )}
    </div>
  );
};

export default ImageOverlay;
