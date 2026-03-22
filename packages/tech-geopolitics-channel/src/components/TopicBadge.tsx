import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { ChapterType } from '../utils/types';

interface TopicBadgeProps {
  topic: string;
  chapterType: ChapterType;
  /** このバッジが表示され始めるフレーム */
  startFrame: number;
  accentColor?: string;
}

// チャプタータイプ別のラベルと色
const CHAPTER_META: Record<ChapterType, { label: string; color: string; icon: string }> = {
  hook:        { label: '注目',  color: '#e53e3e', icon: '●' },
  explanation: { label: '解説',  color: '#3182ce', icon: '▶' },
  analysis:    { label: '分析',  color: '#805ad5', icon: '◆' },
  summary:     { label: 'まとめ', color: '#2f855a', icon: '✔' },
  cta:         { label: 'INFO',  color: '#d69e2e', icon: '★' },
};

export const TopicBadge: React.FC<TopicBadgeProps> = ({
  topic,
  chapterType,
  startFrame,
  accentColor,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - startFrame;
  if (localFrame < 0) return null;

  // スライドインアニメーション（左から）
  const slideIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 28, stiffness: 220, mass: 0.8 },
  });
  const translateX = interpolate(slideIn, [0, 1], [-320, 0]);
  const opacity = interpolate(slideIn, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' });

  const meta = CHAPTER_META[chapterType];
  const badgeColor = accentColor ?? meta.color;

  return (
    <div
      style={{
        position: 'absolute',
        top: 28,
        left: 28,
        zIndex: 60,
        opacity,
        transform: `translateX(${translateX}px)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      {/* チャプタータイプラベル */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          backgroundColor: badgeColor,
          padding: '4px 14px',
          borderRadius: 4,
          width: 'fit-content',
        }}
      >
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.12em' }}>
          {meta.icon}
        </span>
        <span
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '0.1em',
          }}
        >
          {meta.label}
        </span>
      </div>

      {/* トピックテキスト */}
      <div
        style={{
          backgroundColor: 'rgba(0,0,0,0.82)',
          borderLeft: `4px solid ${badgeColor}`,
          padding: '8px 16px',
          borderRadius: '0 6px 6px 0',
          maxWidth: 380,
        }}
      >
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.35,
            letterSpacing: '0.02em',
            textShadow: '0 1px 6px rgba(0,0,0,0.8)',
          }}
        >
          {topic}
        </span>
      </div>
    </div>
  );
};

export default TopicBadge;
