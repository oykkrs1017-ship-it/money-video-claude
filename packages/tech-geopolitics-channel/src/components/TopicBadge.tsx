import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { ChapterType } from '../utils/types';
import { GLASS } from '../styles/glass';

interface TopicBadgeProps {
  topic: string;
  chapterType: ChapterType;
  /** このバッジが表示され始めるフレーム */
  startFrame: number;
  accentColor?: string;
}

// チャプタータイプ別のラベルと色
const CHAPTER_META: Record<string, { label: string; color: string; icon: string }> = {
  hook:          { label: '注目',  color: '#e53e3e', icon: '●' },
  explanation:   { label: '解説',  color: '#3182ce', icon: '▶' },
  explanation_2: { label: '解説②', color: '#2b6cb0', icon: '▶' },
  analysis:      { label: '分析',  color: '#805ad5', icon: '◆' },
  analysis_2:    { label: '分析②', color: '#6b46c1', icon: '◆' },
  summary:       { label: 'まとめ', color: '#2f855a', icon: '✔' },
  cta:           { label: 'INFO',  color: '#d69e2e', icon: '★' },
  chapter:       { label: '解説',  color: '#3182ce', icon: '▶' },
  outro:         { label: 'まとめ', color: '#2f855a', icon: '✔' },
};

const CHAPTER_META_FALLBACK = { label: '解説', color: '#3182ce', icon: '▶' };

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

  const meta = CHAPTER_META[chapterType] ?? CHAPTER_META_FALLBACK;
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
          padding: '4px 16px',
          borderRadius: 20,
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
          backgroundColor: 'rgba(0,0,0,0.55)',
          backdropFilter: GLASS.blur,
          WebkitBackdropFilter: GLASS.blur,
          borderLeft: `4px solid ${badgeColor}`,
          padding: '8px 16px',
          borderRadius: '0 12px 12px 0',
          maxWidth: 540,
        }}
      >
        <span
          style={{
            fontSize: topic.length <= 15 ? 26 : topic.length <= 22 ? 22 : 18,
            fontWeight: 700,
            color: '#ffffff',
            lineHeight: 1.35,
            letterSpacing: '0.02em',
            textShadow: '0 1px 6px rgba(0,0,0,0.8)',
            display: 'block',
            wordBreak: 'break-all',
          }}
        >
          {topic}
        </span>
      </div>
    </div>
  );
};

export default TopicBadge;
