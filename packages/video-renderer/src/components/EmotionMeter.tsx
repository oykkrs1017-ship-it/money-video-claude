import React from 'react';
import {interpolate} from 'remotion';

interface EmotionMeterProps {
  emotion: number;
  color: string;
  isActive: boolean;
}

export const EmotionMeter: React.FC<EmotionMeterProps> = ({
  emotion,
  color,
  isActive,
}) => {
  const fillPercent = interpolate(emotion, [0, 100], [0, 100]);

  const containerStyle: React.CSSProperties = {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const labelTextStyle: React.CSSProperties = {
    fontSize: '11px',
    color: 'rgba(30,30,80,0.5)',
    letterSpacing: '1px',
    textTransform: 'uppercase',
  };

  const valueStyle: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 'bold',
    color: isActive ? color : 'rgba(30,30,80,0.4)',
  };

  const trackStyle: React.CSSProperties = {
    width: '100%',
    height: '8px',
    background: 'rgba(30,30,80,0.08)',
    borderRadius: '4px',
    overflow: 'hidden',
  };

  const fillStyle: React.CSSProperties = {
    height: '100%',
    width: `${fillPercent}%`,
    background: isActive
      ? `linear-gradient(90deg, ${color}88, ${color})`
      : `linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.2))`,
    borderRadius: '4px',
    boxShadow: isActive ? `0 0 8px ${color}` : 'none',
    transition: 'width 0.5s ease',
  };

  return (
    <div style={containerStyle}>
      <div style={labelStyle}>
        <span style={labelTextStyle}>Emotion</span>
        <span style={valueStyle}>{emotion}</span>
      </div>
      <div style={trackStyle}>
        <div style={fillStyle} />
      </div>
    </div>
  );
};
