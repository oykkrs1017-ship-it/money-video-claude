import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { AnimationType, PositionType } from '../types/episode';
import { DESIGN } from '../styles/designSystem';

interface TelopProps {
  text: string;
  position?: PositionType;
  animation?: AnimationType;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  startFrame?: number;
  durationFrames?: number;
}

export const Telop: React.FC<TelopProps> = ({
  text,
  position = 'center',
  animation = 'fade-in',
  fontSize = 48,
  color = DESIGN.colors.textWhite,
  backgroundColor = 'transparent',
  startFrame = 0,
  durationFrames = 90,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  const animTransform = getAnimationTransform(animation, relativeFrame, fps);
  const { baseTransform, ...positionStyle } = getPositionStyle(position);
  // アニメーション transform と中央寄せ translate を合成（上書き防止）
  const transform = baseTransform ? `${baseTransform} ${animTransform}` : animTransform;

  return (
    <div
      style={{
        position: 'absolute',
        ...positionStyle,
        transform,
        padding: '16px 32px',
        backgroundColor: backgroundColor !== 'transparent' ? backgroundColor : undefined,
        borderRadius: 12,
        maxWidth: '90%',
        textAlign: 'center',
      }}
    >
      <span
        style={{
          fontFamily: DESIGN.fonts.heading,
          fontSize,
          fontWeight: 900,
          color,
          textShadow:
            '2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000',
          lineHeight: 1.3,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-all',
        }}
        dangerouslySetInnerHTML={{
          __html: text.replace(
            /<em>(.*?)<\/em>/g,
            `<em style="color:${DESIGN.colors.accentGold};font-style:normal;">$1</em>`,
          ),
        }}
      />
    </div>
  );
};

function getAnimationTransform(
  animation: AnimationType,
  frame: number,
  fps: number,
): string {
  const progress = spring({ frame, fps, config: { damping: 15, stiffness: 150 } });

  switch (animation) {
    case 'slide-up': {
      const y = interpolate(progress, [0, 1], [60, 0]);
      return `translateY(${y}px)`;
    }
    case 'slide-left': {
      const x = interpolate(progress, [0, 1], [100, 0]);
      return `translateX(${x}px)`;
    }
    case 'scale-up': {
      const scale = interpolate(progress, [0, 1], [0.3, 1]);
      return `scale(${scale})`;
    }
    case 'bounce': {
      const y = interpolate(
        spring({ frame, fps, config: { damping: 6, stiffness: 200 } }),
        [0, 1],
        [-30, 0],
      );
      return `translateY(${y}px)`;
    }
    default:
      return 'none';
  }
}

function getPositionStyle(position: PositionType): React.CSSProperties & { baseTransform?: string } {
  switch (position) {
    case 'top':
      return { top: 160, left: '50%', baseTransform: 'translateX(-50%)' };
    case 'bottom':
      return { bottom: 420, left: '50%', baseTransform: 'translateX(-50%)' };
    case 'left':
      return { top: '50%', left: 60 };
    case 'right':
      return { top: '50%', right: 60 };
    default:
      return { top: '50%', left: '50%', baseTransform: 'translate(-50%, -50%)' };
  }
}
