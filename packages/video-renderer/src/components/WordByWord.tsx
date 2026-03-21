import React from 'react';
import {interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

interface WordByWordProps {
  text: string;
  speaker: 'agent_a' | 'agent_b';
  segmentStartFrame: number;
  durationFrames: number;
  color: string;
}

export const WordByWord: React.FC<WordByWordProps> = ({
  text,
  speaker,
  segmentStartFrame,
  durationFrames,
  color,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const localFrame = frame - segmentStartFrame;
  const words = text.split('');  // 文字単位（日本語対応）

  // 全文字を均等に時間配分（最初の80%の時間で全文字表示）
  const revealDuration = durationFrames * 0.8;
  const framesPerChar = revealDuration / Math.max(words.length, 1);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 100,
        left: 80,
        right: 80,
        fontSize: '28px',
        color: '#1a1a4a',
        lineHeight: 1.7,
        fontWeight: 500,
        textShadow: '0 2px 8px rgba(255,255,255,0.8)',
        letterSpacing: '0.5px',
      }}
    >
      <span
        style={{
          display: 'inline-block',
          padding: '4px 14px',
          background: `${color}22`,
          border: `1px solid ${color}66`,
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 'bold',
          color,
          letterSpacing: 2,
          marginBottom: 8,
        }}
      >
        {speaker === 'agent_a' ? 'AXIS' : 'LYRA'}
      </span>
      <br />
      {words.map((char, i) => {
        const charRevealFrame = i * framesPerChar;
        const opacity = interpolate(
          localFrame,
          [charRevealFrame, charRevealFrame + 3],
          [0, 1],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
        );
        const translateY = interpolate(
          localFrame,
          [charRevealFrame, charRevealFrame + 5],
          [8, 0],
          {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
        );
        return (
          <span
            key={i}
            style={{
              opacity,
              display: 'inline-block',
              transform: `translateY(${translateY}px)`,
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};
