import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';
import type {AudioSegment} from '../types';

interface EmotionArcProps {
  audioSegments: AudioSegment[];
}

export const EmotionArc: React.FC<EmotionArcProps> = ({audioSegments}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const currentMs = (frame / fps) * 1000;

  const WIDTH = 140;
  const HEIGHT = 280;
  const PADDING = 16;
  const totalMs = audioSegments[audioSegments.length - 1].start_ms + audioSegments[audioSegments.length - 1].duration_ms;

  // SVGパス生成
  const pointsAxis: string[] = [];
  const pointsLyra: string[] = [];

  audioSegments.forEach((seg) => {
    const x = PADDING + ((seg.start_ms + seg.duration_ms / 2) / totalMs) * (WIDTH - PADDING * 2);
    const y = PADDING + (1 - seg.emotion / 100) * (HEIGHT - PADDING * 2);
    const point = `${x},${y}`;
    if (seg.speaker === 'agent_a') pointsAxis.push(point);
    else pointsLyra.push(point);
  });

  const progressRatio = currentMs / totalMs;
  const clipX = PADDING + progressRatio * (WIDTH - PADDING * 2);

  return (
    <div
      style={{
        position: 'absolute',
        right: 20,
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'rgba(0,0,0,0.6)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 12,
        padding: '12px 8px',
        backdropFilter: 'blur(4px)',
      }}
    >
      <div style={{fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', letterSpacing: 1, marginBottom: 8}}>
        EMOTION ARC
      </div>
      <svg width={WIDTH} height={HEIGHT}>
        {/* グリッド */}
        {[0, 25, 50, 75, 100].map(v => {
          const y = PADDING + (1 - v / 100) * (HEIGHT - PADDING * 2);
          return (
            <g key={v}>
              <line x1={PADDING} y1={y} x2={WIDTH - PADDING} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={PADDING - 2} y={y + 3} fontSize={8} fill="rgba(255,255,255,0.2)" textAnchor="end">{v}</text>
            </g>
          );
        })}

        {/* AXISライン */}
        <polyline
          points={pointsAxis.join(' ')}
          fill="none"
          stroke="#00d4ff"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeLinejoin="round"
        />

        {/* LYRAライン */}
        <polyline
          points={pointsLyra.join(' ')}
          fill="none"
          stroke="#bf5af2"
          strokeWidth={1.5}
          strokeOpacity={0.6}
          strokeLinejoin="round"
        />

        {/* 現在位置ライン */}
        <line
          x1={clipX}
          y1={PADDING}
          x2={clipX}
          y2={HEIGHT - PADDING}
          stroke="rgba(255,255,255,0.5)"
          strokeWidth={1}
          strokeDasharray="3,3"
        />
      </svg>

      {/* 凡例 */}
      <div style={{display: 'flex', gap: 8, justifyContent: 'center', marginTop: 6}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 3}}>
          <div style={{width: 12, height: 2, background: '#00d4ff', borderRadius: 1}} />
          <span style={{fontSize: 9, color: 'rgba(255,255,255,0.4)'}}>AXIS</span>
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 3}}>
          <div style={{width: 12, height: 2, background: '#bf5af2', borderRadius: 1}} />
          <span style={{fontSize: 9, color: 'rgba(255,255,255,0.4)'}}>LYRA</span>
        </div>
      </div>
    </div>
  );
};
