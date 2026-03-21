import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {EmotionMeter} from './EmotionMeter';
import {CharacterFace} from './CharacterFace';

interface AgentCardProps {
  name: string;
  side: 'left' | 'right';
  color: string;
  isActive: boolean;
  emotion: number;
  position: string;
}

export const AgentCard: React.FC<AgentCardProps> = ({
  name,
  side,
  color,
  isActive,
  emotion,
  position,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const activeScale = spring({
    frame,
    fps,
    config: {damping: 12, stiffness: 100},
    from: isActive ? 1.0 : 1.05,
    to: isActive ? 1.05 : 1.0,
  });

  const glowIntensity = isActive ? interpolate(emotion, [0, 100], [8, 30]) : 0;

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 28px',
    // glassmorphism
    background: isActive
      ? `linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.55))`
      : `linear-gradient(135deg, rgba(255,255,255,0.55), rgba(255,255,255,0.35))`,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: `1px solid ${isActive ? color : 'rgba(255,255,255,0.6)'}`,
    borderRadius: '24px',
    minWidth: '450px',
    flex: 1,
    transform: `scale(${activeScale})`,
    boxShadow: isActive
      ? `0 8px 40px ${color}30, 0 0 0 1px ${color}40, inset 0 1px 0 rgba(255,255,255,0.8)`
      : '0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)',
  };

  const avatarWrapperStyle: React.CSSProperties = {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '32px',
    fontWeight: '900',
    color: color,
    letterSpacing: '4px',
    marginBottom: '8px',
    textShadow: isActive ? `0 0 20px ${color}88` : 'none',
  };

  const positionStyle: React.CSSProperties = {
    fontSize: '13px',
    color: 'rgba(30,30,60,0.65)',
    textAlign: 'center',
    lineHeight: '1.5',
    maxWidth: '260px',
    marginBottom: '20px',
    fontWeight: '500',
  };

  const sideLabel: React.CSSProperties = {
    fontSize: '11px',
    color: isActive ? color : 'rgba(30,30,60,0.4)',
    letterSpacing: '3px',
    textTransform: 'uppercase' as const,
    marginBottom: '8px',
    fontWeight: '600',
  };

  return (
    <div style={containerStyle}>
      <div style={sideLabel}>{side === 'left' ? 'AFFIRMATIVE' : 'NEGATIVE'}</div>
      <div style={avatarWrapperStyle}>
        <CharacterFace
          name={name as 'AXIS' | 'LYRA'}
          emotion={emotion}
          isActive={isActive}
          color={color}
          size={150}
        />
      </div>
      <div style={nameStyle}>{name}</div>
      <div style={positionStyle}>{position}</div>
      <EmotionMeter emotion={emotion} color={color} isActive={isActive} />
    </div>
  );
};
