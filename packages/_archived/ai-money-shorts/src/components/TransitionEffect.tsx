import React from 'react';
import { useCurrentFrame, interpolate } from 'remotion';
import { DESIGN } from '../styles/designSystem';

type TransitionType = 'wipe' | 'fade' | 'slide' | 'zoom';

interface TransitionEffectProps {
  type?: TransitionType;
  duration?: number;
  direction?: 'in' | 'out';
}

export const TransitionEffect: React.FC<TransitionEffectProps> = ({
  type = 'fade',
  duration = 15,
  direction = 'in',
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / duration);
  const opacity =
    direction === 'in'
      ? interpolate(progress, [0, 1], [1, 0])
      : interpolate(progress, [0, 1], [0, 1]);

  if (type === 'fade') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: DESIGN.colors.primaryBg,
          opacity,
          pointerEvents: 'none',
        }}
      />
    );
  }

  if (type === 'wipe') {
    const wipeY = interpolate(
      progress,
      [0, 1],
      direction === 'in' ? [0, 1920] : [1920, 0],
    );
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: `${wipeY}px`,
          backgroundColor: DESIGN.colors.primaryBg,
          pointerEvents: 'none',
        }}
      />
    );
  }

  if (type === 'slide') {
    const x = interpolate(
      progress,
      [0, 1],
      direction === 'in' ? [0, 1080] : [1080, 0],
    );
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: `${x}px`,
          width: '100%',
          height: '100%',
          backgroundColor: DESIGN.colors.primaryBg,
          pointerEvents: 'none',
        }}
      />
    );
  }

  // zoom
  const scale = interpolate(
    progress,
    [0, 1],
    direction === 'in' ? [1, 0.8] : [0.8, 1],
  );
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: DESIGN.colors.primaryBg,
        opacity,
        transform: `scale(${scale})`,
        pointerEvents: 'none',
      }}
    />
  );
};
