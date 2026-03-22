import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

interface ProgressBarProps {
  /** 動画の総フレーム数 */
  totalFrames: number;
  /** バーの色 */
  color?: string;
  /** バーの高さ(px) */
  height?: number;
  /** 表示位置: 'top' | 'bottom' */
  position?: 'top' | 'bottom';
  /** チャプター区切り位置（フレーム数の配列） */
  chapterMarkers?: number[];
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  totalFrames,
  color = '#64a0ff',
  height = 4,
  position = 'bottom',
  chapterMarkers = [],
}) => {
  const frame = useCurrentFrame();

  const progress = interpolate(frame, [0, totalFrames], [0, 100], {
    extrapolateRight: 'clamp',
  });

  const positionStyle: React.CSSProperties =
    position === 'top' ? { top: 0 } : { bottom: 0 };

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        ...positionStyle,
        height,
        backgroundColor: 'rgba(255,255,255,0.15)',
        zIndex: 100,
      }}
    >
      {/* 進捗バー本体 */}
      <div
        style={{
          height: '100%',
          width: `${progress}%`,
          background: `linear-gradient(90deg, ${color}, ${color}cc)`,
          boxShadow: `0 0 8px ${color}88`,
          transition: 'width 0ms',
          borderRadius: '0 2px 2px 0',
        }}
      />

      {/* チャプターマーカー */}
      {chapterMarkers.map((markerFrame, i) => {
        const markerPos = (markerFrame / totalFrames) * 100;
        const isPassed = frame >= markerFrame;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${markerPos}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: height * 2,
              height: height * 2,
              borderRadius: '50%',
              backgroundColor: isPassed ? color : 'rgba(255,255,255,0.4)',
              boxShadow: isPassed ? `0 0 6px ${color}` : 'none',
            }}
          />
        );
      })}
    </div>
  );
};

export default ProgressBar;
