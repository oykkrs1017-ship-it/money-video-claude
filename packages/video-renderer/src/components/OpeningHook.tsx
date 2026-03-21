import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';

const AXIS_COLOR = '#00d4ff';
const LYRA_COLOR = '#bf5af2';
const HOOK_DURATION = 90; // 3 seconds at 30fps

export const OpeningHook: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  if (frame > HOOK_DURATION) return null;

  // 全体のフェードアウト（最後の15フレーム）
  const overallOpacity = interpolate(
    frame,
    [0, 5, HOOK_DURATION - 15, HOOK_DURATION],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );

  // ロゴスケールイン
  const logoScale = spring({
    frame,
    fps,
    config: {damping: 12, stiffness: 80},
    from: 0.5,
    to: 1.0,
  });

  // VS テキスト
  const vsOpacity = interpolate(frame, [20, 35], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // サブタイトル
  const subOpacity = interpolate(frame, [35, 50], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // スキャンラインアニメ
  const scanY = interpolate(frame, [0, HOOK_DURATION], [-100, 1280]);

  return (
    <AbsoluteFill
      style={{
        background: 'radial-gradient(ellipse at center, #0d0d2b 0%, #000000 100%)',
        opacity: overallOpacity,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        zIndex: 100,
      }}
    >
      {/* スキャンライン */}
      <div
        style={{
          position: 'absolute',
          top: scanY,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${AXIS_COLOR}88, transparent)`,
          pointerEvents: 'none',
        }}
      />

      {/* グリッドオーバーレイ */}
      <AbsoluteFill
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,212,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.04) 1px, transparent 1px)',
          backgroundSize: '80px 80px',
          pointerEvents: 'none',
        }}
      />

      {/* メインコンテンツ */}
      <div
        style={{
          transform: `scale(${logoScale})`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        {/* エージェント名 */}
        <div style={{display: 'flex', alignItems: 'center', gap: 60}}>
          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: AXIS_COLOR,
              letterSpacing: 8,
              textShadow: `0 0 40px ${AXIS_COLOR}`,
            }}
          >
            AXIS
          </span>

          <div style={{opacity: vsOpacity, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
            <span
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.6)',
                letterSpacing: 6,
              }}
            >
              VS
            </span>
            <div
              style={{
                width: 2,
                height: 60,
                background: `linear-gradient(to bottom, ${AXIS_COLOR}, ${LYRA_COLOR})`,
                margin: '8px 0',
              }}
            />
          </div>

          <span
            style={{
              fontSize: 72,
              fontWeight: 900,
              color: LYRA_COLOR,
              letterSpacing: 8,
              textShadow: `0 0 40px ${LYRA_COLOR}`,
              opacity: vsOpacity,
            }}
          >
            LYRA
          </span>
        </div>

        {/* サブタイトル */}
        <div
          style={{
            opacity: subOpacity,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 600,
              height: 1,
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
            }}
          />
          <span
            style={{
              fontSize: 24,
              color: 'rgba(255,255,255,0.85)',
              letterSpacing: 3,
              fontWeight: 300,
            }}
          >
            AI DEBATE SIMULATION
          </span>
          <span
            style={{
              fontSize: 32,
              color: '#ffffff',
              letterSpacing: 2,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            AIは人間の仕事を奪うか
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
