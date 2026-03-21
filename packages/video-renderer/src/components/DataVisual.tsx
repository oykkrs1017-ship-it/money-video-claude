import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import type {DataVisual as DataVisualType} from '../types';

interface DataVisualProps {
  dataVisual: DataVisualType;
  color: string;
  startFrame: number;
}

export const DataVisual: React.FC<DataVisualProps> = ({dataVisual, color, startFrame}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const localFrame = frame - startFrame;

  const containerOpacity = interpolate(localFrame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const maxValue = Math.max(...dataVisual.data.map(d => d.value));

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
        opacity: containerOpacity,
      }}
    >
      <div
        style={{
          background: 'rgba(0,0,0,0.85)',
          border: `1px solid ${color}44`,
          borderRadius: 16,
          padding: '32px 40px',
          minWidth: 500,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 0 40px ${color}22`,
        }}
      >
        <div
          style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.8)',
            marginBottom: 24,
            textAlign: 'center',
            letterSpacing: 1,
          }}
        >
          {dataVisual.title}
        </div>
        <div style={{display: 'flex', gap: 24, alignItems: 'flex-end', height: 160}}>
          {dataVisual.data.map((item, i) => {
            const targetHeight = (item.value / maxValue) * 140;
            const animatedHeight = spring({
              frame: localFrame - i * 4,
              fps,
              config: {damping: 14, stiffness: 80},
              from: 0,
              to: targetHeight,
            });
            return (
              <div key={i} style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1}}>
                <div style={{fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center'}}>{item.value.toLocaleString()}</div>
                <div
                  style={{
                    width: '100%',
                    height: animatedHeight,
                    background: `linear-gradient(to top, ${color}cc, ${color}44)`,
                    borderRadius: '4px 4px 0 0',
                    boxShadow: `0 0 12px ${color}44`,
                    minHeight: 2,
                  }}
                />
                <div style={{fontSize: 12, color: 'rgba(255,255,255,0.6)', textAlign: 'center', lineHeight: 1.3}}>{item.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
