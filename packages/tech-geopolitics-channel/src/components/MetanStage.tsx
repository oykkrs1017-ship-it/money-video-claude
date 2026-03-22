import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { EmotionType } from '../utils/types';

interface MetanStageProps {
  emotion: EmotionType;
  isSpeaking: boolean;
  startFrame: number;
  position?: 'left' | 'right' | 'center';
  height?: number;
}

export const MetanStage: React.FC<MetanStageProps> = ({
  emotion,
  isSpeaking,
  startFrame,
  position = 'left',
  height = 320,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const slideIn = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120, mass: 1 },
  });

  // 呼吸アニメーション（ずんだもんと位相をずらす）
  const breathY = isSpeaking ? 0 : Math.sin((frame + fps * 0.4) / (fps * 0.8) * Math.PI * 2) * 2;

  const mouthOpen = isSpeaking && Math.floor(frame / 5) % 2 === 0;

  // 感情→画像パスのマッピング
  const getImagePath = (): string => {
    if (mouthOpen) {
      return 'images/ponchan/ponchan_open.png';
    }
    switch (emotion) {
      case 'happy':
        return 'images/ponchan/ponchan_happy.png';
      case 'serious':
        return 'images/ponchan/ponchan_angry.png';
      case 'sad':
        return 'images/ponchan/ponchan_sad.png';
      case 'surprised':
        return 'images/ponchan/ponchan_sad.png';
      case 'thinking':
        return 'images/ponchan/ponchan_close.png';
      case 'normal':
      default:
        return 'images/ponchan/ponchan_close.png';
    }
  };

  const imagePath = getImagePath();

  const positionStyle: React.CSSProperties =
    position === 'left'
      ? { left: '-8%' }
      : position === 'right'
      ? { right: '-8%' }
      : { left: '50%', transform: 'translateX(-50%)' };

  const translateY = interpolate(slideIn, [0, 1], [height * 0.3, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        ...positionStyle,
        transform: `translateY(${translateY + breathY}px)`,
        height,
        opacity: slideIn,
      }}
    >
      <Img
        src={staticFile(imagePath)}
        alt="ponchan"
        style={{
          height: '100%',
          width: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export default MetanStage;
