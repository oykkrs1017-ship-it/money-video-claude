import React from 'react';
import { useCurrentFrame } from 'remotion';
import { DESIGN } from '../styles/designSystem';

interface ProgressBarProps {
  totalFrames: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ totalFrames }) => {
  const frame = useCurrentFrame();
  const progress = Math.min(1, frame / totalFrames);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.15)',
      }}
    >
      <div
        style={{
          width: `${progress * 100}%`,
          height: '100%',
          backgroundColor: DESIGN.colors.accentGold,
          boxShadow: `0 0 8px ${DESIGN.colors.accentGold}`,
          transition: 'none',
        }}
      />
    </div>
  );
};
