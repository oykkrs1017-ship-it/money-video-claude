import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate, Img, staticFile } from 'remotion';
import { EmotionType } from '../utils/types';

interface ZundamonStageProps {
  /** 現在の表情 */
  emotion: EmotionType;
  /** このキャラが話しているか（口パク制御） */
  isSpeaking: boolean;
  /** 話し始めフレーム（スライドイン計算用） */
  startFrame: number;
  /** キャラ配置位置 */
  position?: 'left' | 'right' | 'center';
  /** キャラの高さ(px) デフォルト 320 */
  height?: number;
}

export const ZundamonStage: React.FC<ZundamonStageProps> = ({
  emotion,
  isSpeaking,
  startFrame,
  position = 'right',
  height = 320,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // スライドイン登場アニメーション
  const slideIn = spring({
    frame: frame - startFrame,
    fps,
    config: { damping: 18, stiffness: 120, mass: 1 },
  });

  // 話していないときの呼吸アニメーション（sinカーブで上下2px）
  const breathY = isSpeaking ? 0 : Math.sin(frame / (fps * 0.8) * Math.PI * 2) * 2;

  // 口パク（約6fps の開閉）
  const mouthOpen = isSpeaking && Math.floor(frame / 5) % 2 === 0;

  // 感情→画像パスのマッピング
  const getImagePath = (): string => {
    if (mouthOpen) {
      return 'images/maro/maro_open.png';
    }
    switch (emotion) {
      case 'happy':
        return 'images/maro/maro_happy.png';
      case 'serious':
        return 'images/maro/maro_angry.png';
      case 'sad':
        return 'images/maro/maro_sad.png';
      case 'surprised':
        return 'images/maro/maro_sad.png';
      case 'thinking':
        return 'images/maro/maro_close.png';
      case 'normal':
      default:
        return 'images/maro/maro_close.png';
    }
  };

  const imagePath = getImagePath();

  // 水平位置
  const positionStyle: React.CSSProperties =
    position === 'left'
      ? { left: '-8%' }
      : position === 'right'
      ? { right: '-8%' }
      : { left: '50%', transform: 'translateX(-50%)' };

  // スライドイン: 画面外(下)から登場
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
        alt="maro"
        style={{
          height: '100%',
          width: 'auto',
          objectFit: 'contain',
        }}
      />
    </div>
  );
};

export default ZundamonStage;
