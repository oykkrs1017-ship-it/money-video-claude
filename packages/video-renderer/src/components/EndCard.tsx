import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const AXIS_COLOR = '#00d4ff';
const LYRA_COLOR = '#bf5af2';

interface EndCardProps {
  totalFrames: number;
}

export const EndCard: React.FC<EndCardProps> = ({totalFrames}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const START_FRAME = totalFrames - fps * 10; // 最後の10秒

  if (frame < START_FRAME) return null;

  const localFrame = frame - START_FRAME;

  const bgOpacity = interpolate(localFrame, [0, 30], [0, 0.95], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const contentScale = spring({
    frame: localFrame,
    fps,
    config: {damping: 14, stiffness: 100},
    from: 0.8,
    to: 1.0,
  });

  const contentOpacity = interpolate(localFrame, [10, 40], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // CTAボタンのパルスアニメ
  const pulseScale = 1 + Math.sin(localFrame * 0.12) * 0.03;

  return (
    <AbsoluteFill
      style={{
        background: `rgba(5, 5, 20, ${bgOpacity})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 40,
      }}
    >
      <div
        style={{
          transform: `scale(${contentScale})`,
          opacity: contentOpacity,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 32,
        }}
      >
        {/* ティーザー */}
        <div
          style={{
            fontSize: 20,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: 3,
            textTransform: 'uppercase',
          }}
        >
          この議論、もし別の結末があったら？
        </div>

        {/* メインCTA */}
        <div
          style={{
            fontSize: 38,
            fontWeight: 900,
            color: '#ffffff',
            textAlign: 'center',
            lineHeight: 1.4,
            textShadow: `0 0 30px rgba(100,100,255,0.5)`,
          }}
        >
          「アナザーストーリー」を
          <br />
          <span style={{color: AXIS_COLOR}}>公式LINE</span>で限定公開中
        </div>

        {/* LINEボタン */}
        <div
          style={{
            transform: `scale(${pulseScale})`,
            padding: '18px 56px',
            background: `linear-gradient(135deg, #06C755, #04a844)`,
            borderRadius: 60,
            fontSize: 22,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: 2,
            boxShadow: `0 0 40px rgba(6, 199, 85, 0.5)`,
          }}
        >
          LINE で続きを見る →
        </div>

        {/* 仕切り線 */}
        <div
          style={{
            width: 500,
            height: 1,
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)`,
          }}
        />

        {/* 動画タイトル */}
        <div style={{display: 'flex', gap: 24, alignItems: 'center'}}>
          <span style={{fontSize: 16, color: AXIS_COLOR, fontWeight: 700}}>AXIS</span>
          <span style={{fontSize: 12, color: 'rgba(255,255,255,0.3)'}}>VS</span>
          <span style={{fontSize: 16, color: LYRA_COLOR, fontWeight: 700}}>LYRA</span>
          <span style={{fontSize: 12, color: 'rgba(255,255,255,0.4)'}}>｜AI DEBATE SIMULATION</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
