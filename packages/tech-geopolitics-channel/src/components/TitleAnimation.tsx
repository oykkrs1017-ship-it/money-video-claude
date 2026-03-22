import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import { TitleStyleType } from '../utils/types';

interface TitleAnimationProps {
  title: string;
  style: TitleStyleType;
  /** 表示開始フレーム */
  startFrame?: number;
  color?: string;
  fontSize?: number;
}

export const TitleAnimation: React.FC<TitleAnimationProps> = ({
  title,
  style,
  startFrame = 0,
  color = '#ffffff',
  fontSize = 72,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  const progress = spring({ frame: localFrame, fps, config: { damping: 18, stiffness: 100 } });

  const renderTitle = () => {
    switch (style) {
      // ---- slide-left: 右から左へスライドイン ----
      case 'slide-left': {
        const x = interpolate(progress, [0, 1], [200, 0]);
        const opacity = interpolate(progress, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });
        return (
          <div style={{ transform: `translateX(${x}px)`, opacity }}>
            <TitleText title={title} color={color} fontSize={fontSize} />
          </div>
        );
      }

      // ---- fade-scale: フェードしながら拡大 ----
      case 'fade-scale': {
        const scale = interpolate(progress, [0, 1], [0.7, 1]);
        return (
          <div style={{ transform: `scale(${scale})`, opacity: progress }}>
            <TitleText title={title} color={color} fontSize={fontSize} />
          </div>
        );
      }

      // ---- typewriter: 1文字ずつ表示 ----
      case 'typewriter': {
        const chars = Math.floor(interpolate(localFrame, [0, title.length * 3], [0, title.length], { extrapolateRight: 'clamp' }));
        const displayText = title.slice(0, chars);
        return (
          <div style={{ opacity: 1 }}>
            <TitleText title={displayText + (chars < title.length ? '|' : '')} color={color} fontSize={fontSize} />
          </div>
        );
      }

      // ---- glitch: グリッチ風ノイズアニメーション ----
      case 'glitch': {
        const glitchActive = localFrame < 20 && localFrame % 4 < 2;
        const offsetX = glitchActive ? (Math.random() - 0.5) * 8 : 0;
        const offsetY = glitchActive ? (Math.random() - 0.5) * 4 : 0;
        return (
          <div style={{ position: 'relative', opacity: progress }}>
            {/* 赤チャネルオフセット */}
            {glitchActive && (
              <div style={{ position: 'absolute', transform: `translate(${offsetX}px, ${offsetY}px)`, color: '#ff4444', mixBlendMode: 'screen' }}>
                <TitleText title={title} color="#ff4444" fontSize={fontSize} />
              </div>
            )}
            {/* 青チャネルオフセット */}
            {glitchActive && (
              <div style={{ position: 'absolute', transform: `translate(${-offsetX}px, ${-offsetY}px)`, color: '#4444ff', mixBlendMode: 'screen' }}>
                <TitleText title={title} color="#4444ff" fontSize={fontSize} />
              </div>
            )}
            <TitleText title={title} color={color} fontSize={fontSize} />
          </div>
        );
      }

      // ---- split-reveal: 上下に分割してスライドイン ----
      case 'split-reveal': {
        const topY = interpolate(progress, [0, 1], [-60, 0]);
        const bottomY = interpolate(progress, [0, 1], [60, 0]);
        const half = Math.ceil(title.length / 2);
        return (
          <div style={{ overflow: 'hidden', position: 'relative' }}>
            <div style={{ transform: `translateY(${topY}px)`, opacity: progress }}>
              <TitleText title={title.slice(0, half)} color={color} fontSize={fontSize} />
            </div>
            <div style={{ transform: `translateY(${bottomY}px)`, opacity: progress }}>
              <TitleText title={title.slice(half)} color={color} fontSize={fontSize} />
            </div>
          </div>
        );
      }

      default:
        return <TitleText title={title} color={color} fontSize={fontSize} />;
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        width: '80%',
        zIndex: 20,
      }}
    >
      {renderTitle()}
    </div>
  );
};

// サブコンポーネント: 袋文字タイトル
const TitleText: React.FC<{ title: string; color: string; fontSize: number }> = ({ title, color, fontSize }) => (
  <div
    style={{
      fontSize,
      fontWeight: 900,
      color,
      textShadow: [
        '-3px -3px 0 rgba(0,0,0,0.9)',
        '3px -3px 0 rgba(0,0,0,0.9)',
        '-3px 3px 0 rgba(0,0,0,0.9)',
        '3px 3px 0 rgba(0,0,0,0.9)',
        `0 0 30px ${color}66`,
      ].join(', '),
      lineHeight: 1.3,
      letterSpacing: '0.02em',
    }}
  >
    {title}
  </div>
);

export default TitleAnimation;
