import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

interface SubtitleBarProps {
  text: string;
  speaker: 'agent_a' | 'agent_b';
  segmentStartFrame: number;
}

export const SubtitleBar: React.FC<SubtitleBarProps> = ({
  text,
  speaker,
  segmentStartFrame,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const AXIS_COLOR = '#00d4ff';
  const LYRA_COLOR = '#bf5af2';
  const color = speaker === 'agent_a' ? AXIS_COLOR : LYRA_COLOR;
  const speakerName = speaker === 'agent_a' ? 'AXIS' : 'LYRA';

  const localFrame = frame - segmentStartFrame;

  const opacity = spring({
    frame: localFrame,
    fps,
    config: {damping: 20, stiffness: 200},
    from: 0,
    to: 1,
  });

  const translateY = interpolate(
    spring({
      frame: localFrame,
      fps,
      config: {damping: 20, stiffness: 200},
      from: 0,
      to: 1,
    }),
    [0, 1],
    [20, 0]
  );

  const containerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '20px 80px 32px 80px',
    background: 'linear-gradient(0deg, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 70%, transparent 100%)',
    opacity,
    transform: `translateY(${translateY}px)`,
  };

  const innerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-start',
    maxWidth: '1400px',
    margin: '0 auto',
  };

  const speakerBadgeStyle: React.CSSProperties = {
    flexShrink: 0,
    padding: '4px 12px',
    background: `${color}22`,
    border: `1px solid ${color}`,
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: color,
    letterSpacing: '2px',
    marginTop: '2px',
  };

  const textStyle: React.CSSProperties = {
    fontSize: '26px',
    color: '#ffffff',
    lineHeight: '1.6',
    fontWeight: '500',
    textShadow: '0 2px 8px rgba(0,0,0,0.8)',
    letterSpacing: '0.5px',
  };

  return (
    <div style={containerStyle}>
      <div style={innerStyle}>
        <div style={speakerBadgeStyle}>{speakerName}</div>
        <div style={textStyle}>{text}</div>
      </div>
    </div>
  );
};
