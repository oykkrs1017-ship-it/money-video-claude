import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const ENDING_DURATION_SEC = 20;

export const EndingSequence: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const cardW = Math.round(width * 0.22);
  const cardH = Math.round(cardW * 9 / 16);

  // Global fade in/out (フェードイン 0.5s, フェードアウト 最後2s)
  const globalOpacity = interpolate(
    frame,
    [0, fps * 0.5, fps * (ENDING_DURATION_SEC - 2), fps * ENDING_DURATION_SEC],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );

  // チャンネルブランディング（0.5〜2秒でフェードイン）
  const brandOpacity = interpolate(frame, [fps * 0.5, fps * 2], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const brandY = interpolate(frame, [fps * 0.5, fps * 2], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 左カード（2〜3.5秒でスライドイン）
  const leftProgress = interpolate(frame, [fps * 2, fps * 3.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // 右カード（3〜4.5秒でスライドイン）
  const rightProgress = interpolate(frame, [fps * 3, fps * 4.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // チャンネル登録ボタン（4〜5.5秒でフェードイン、その後パルス）
  const subOpacity = interpolate(frame, [fps * 4, fps * 5.5], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const pulseFrame = Math.max(0, frame - fps * 5.5);
  const subScale = 1 + 0.03 * Math.sin((pulseFrame / fps) * Math.PI * 1.5);

  // カード配置計算（左30%中心・右70%中心）
  const leftCardLeft = Math.round(width * 0.3 - cardW / 2);
  const rightCardLeft = Math.round(width * 0.7 - cardW / 2);
  const cardTop = Math.round(height * 0.42);

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(160deg, #080D1A 0%, #0E1530 60%, #080810 100%)',
        opacity: globalOpacity,
        fontFamily: 'inherit',
      }}
    >
      {/* グリッドテクスチャ */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ブランディングエリアのグロー */}
      <div
        style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: width * 0.6,
          height: height * 0.35,
          background:
            'radial-gradient(ellipse at center, rgba(40,100,240,0.12) 0%, transparent 70%)',
        }}
      />

      {/* チャンネルブランディング */}
      <div
        style={{
          position: 'absolute',
          top: '8%',
          left: '50%',
          transform: `translateX(-50%) translateY(${brandY}px)`,
          opacity: brandOpacity,
          textAlign: 'center',
          whiteSpace: 'nowrap',
        }}
      >
        <div
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: Math.round(width * 0.012),
            letterSpacing: '0.35em',
            fontWeight: 400,
            marginBottom: 10,
          }}
        >
          TECHNOLOGY INVESTMENT × GEOPOLITICS
        </div>
        <div
          style={{
            color: '#ffffff',
            fontSize: Math.round(width * 0.03),
            fontWeight: 800,
            letterSpacing: '0.04em',
            textShadow: '0 2px 24px rgba(80,140,255,0.4)',
          }}
        >
          テクノロジー投資 × 地政学
        </div>
        <div
          style={{
            color: 'rgba(255,210,80,0.9)',
            fontSize: Math.round(width * 0.015),
            fontWeight: 600,
            marginTop: 14,
            letterSpacing: '0.06em',
          }}
        >
          最後までご視聴ありがとうございました
        </div>
      </div>

      {/* ディバイダーライン */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: interpolate(brandOpacity, [0, 1], [0, 600]),
          height: 1,
          background:
            'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
        }}
      />

      {/* 左カード（最新動画） */}
      <div
        style={{
          position: 'absolute',
          top: cardTop,
          left: leftCardLeft + interpolate(leftProgress, [0, 1], [-80, 0]),
          width: cardW,
          height: cardH,
          opacity: leftProgress,
          background: 'rgba(255,255,255,0.07)',
          border: '2px dashed rgba(255,255,255,0.28)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: Math.round(width * 0.025), color: 'rgba(255,255,255,0.7)' }}>
          ▶
        </div>
        <div
          style={{ color: '#ffffff', fontSize: Math.round(width * 0.013), fontWeight: 700 }}
        >
          最新動画
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: Math.round(width * 0.009) }}>
          YouTube が自動で表示
        </div>
      </div>

      {/* 右カード（おすすめ動画） */}
      <div
        style={{
          position: 'absolute',
          top: cardTop,
          left: rightCardLeft + interpolate(rightProgress, [0, 1], [80, 0]),
          width: cardW,
          height: cardH,
          opacity: rightProgress,
          background: 'rgba(255,255,255,0.07)',
          border: '2px dashed rgba(255,255,255,0.28)',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}
      >
        <div style={{ fontSize: Math.round(width * 0.025), color: 'rgba(255,255,255,0.7)' }}>
          ▶
        </div>
        <div
          style={{ color: '#ffffff', fontSize: Math.round(width * 0.013), fontWeight: 700 }}
        >
          おすすめ動画
        </div>
        <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: Math.round(width * 0.009) }}>
          YouTube が自動で表示
        </div>
      </div>

      {/* チャンネル登録ボタン */}
      <div
        style={{
          position: 'absolute',
          bottom: '10%',
          left: '50%',
          transform: `translateX(-50%) scale(${subScale})`,
          opacity: subOpacity,
          background: 'linear-gradient(135deg, #FF2222 0%, #CC0000 100%)',
          borderRadius: 999,
          padding: `${Math.round(height * 0.018)}px ${Math.round(width * 0.038)}px`,
          display: 'flex',
          alignItems: 'center',
          gap: Math.round(width * 0.009),
          boxShadow: '0 0 50px rgba(255,0,0,0.3), 0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <span style={{ fontSize: Math.round(width * 0.02) }}>🔔</span>
        <span
          style={{
            color: '#ffffff',
            fontSize: Math.round(width * 0.02),
            fontWeight: 800,
            letterSpacing: '0.06em',
          }}
        >
          チャンネル登録
        </span>
      </div>
    </div>
  );
};
