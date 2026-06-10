import React from 'react';
import { useCurrentFrame, spring, interpolate, useVideoConfig } from 'remotion';

interface ChapterCardProps {
  chapterIndex: number;
  type: string;
  topic: string;
  startFrame: number;
  accentColor: string;
}

const CARD_DURATION = 48; // 1.6秒 @30fps
const HOLD_UNTIL    = 36; // 1.2秒まではホールド
const FADE_START    = 36;

const TYPE_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  hook:        { label: 'フック',  icon: '🎯', color: '#e53e3e' },
  explanation: { label: '解説',    icon: '📊', color: '#3182ce' },
  analysis:    { label: '分析',    icon: '🔍', color: '#805ad5' },
  summary:     { label: 'まとめ',  icon: '📝', color: '#38a169' },
  cta:         { label: 'CTA',     icon: '📢', color: '#dd6b20' },
};

export const ChapterCard: React.FC<ChapterCardProps> = ({
  chapterIndex,
  type,
  topic,
  startFrame,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < 0 || localFrame >= CARD_DURATION) return null;

  const cfg = TYPE_CONFIG[type] ?? { label: type, icon: '▶', color: accentColor };

  // スライドイン
  const slideSpring = spring({
    frame: localFrame,
    fps,
    config: { damping: 22, stiffness: 180 },
  });
  const translateX = interpolate(slideSpring, [0, 1], [-width * 0.55, 0]);

  // フェードアウト
  const opacity = localFrame < FADE_START
    ? 1
    : interpolate(localFrame, [FADE_START, CARD_DURATION], [1, 0], {
        extrapolateRight: 'clamp',
      });

  // バーのワイプアニメーション
  const barWidth = interpolate(
    spring({ frame: localFrame, fps, config: { damping: 28, stiffness: 200 } }),
    [0, 1], [0, 6]
  );

  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: 0,
      transform: `translateY(-50%) translateX(${translateX}px)`,
      opacity,
      zIndex: 80,
      display: 'flex',
      alignItems: 'stretch',
      pointerEvents: 'none',
    }}>
      {/* 左アクセントバー */}
      <div style={{
        width: barWidth,
        background: cfg.color,
        borderRadius: '0 0 0 0',
        flexShrink: 0,
      }} />

      {/* カード本体 */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(0,0,0,0.92) 0%, rgba(20,20,30,0.95) 100%)',
        backdropFilter: 'blur(8px)',
        padding: '20px 48px 20px 32px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        borderTop: `1px solid ${cfg.color}44`,
        borderBottom: `1px solid ${cfg.color}44`,
        borderRight: `1px solid ${cfg.color}22`,
        boxShadow: `0 4px 40px rgba(0,0,0,0.6), inset 0 0 60px ${cfg.color}08`,
      }}>
        {/* 章番号 + タイプバッジ */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{
            fontSize: 18,
            color: 'rgba(255,255,255,0.4)',
            fontWeight: 600,
            letterSpacing: '0.1em',
          }}>
            {String(chapterIndex + 1).padStart(2, '0')}
          </span>
          <div style={{
            background: cfg.color,
            color: '#fff',
            fontSize: 18,
            fontWeight: 700,
            padding: '3px 14px',
            borderRadius: 4,
            letterSpacing: '0.08em',
          }}>
            {cfg.icon} {cfg.label}
          </div>
        </div>

        {/* トピックタイトル */}
        <div style={{
          fontSize: 36,
          fontWeight: 800,
          color: '#ffffff',
          letterSpacing: '0.04em',
          textShadow: `0 2px 12px ${cfg.color}88`,
          lineHeight: 1.2,
          maxWidth: 900,
        }}>
          {topic}
        </div>
      </div>
    </div>
  );
};

export default ChapterCard;
