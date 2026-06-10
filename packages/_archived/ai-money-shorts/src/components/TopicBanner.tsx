import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { DESIGN } from '../styles/designSystem';

interface TopicBannerProps {
  /** エピソードタイトル（動画全体を通じて常時表示） */
  episodeTitle: string;
  /** 現在のセクション名（変わるたびにスライドイン） */
  sectionName: string;
  /** セクション番号（1始まり） */
  sectionNumber: number;
  /** 総セクション数 */
  totalSections: number;
  /** このセクションが始まったグローバルフレーム */
  sectionStartFrame: number;
}

export const TopicBanner: React.FC<TopicBannerProps> = ({
  episodeTitle,
  sectionName,
  sectionNumber,
  totalSections,
  sectionStartFrame,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const localFrame = frame - sectionStartFrame;

  // セクション名スライドイン（セクションが変わるたびに再アニメーション）
  const slideProgress = spring({
    frame: localFrame,
    fps,
    config: { damping: 16, stiffness: 220 },
  });
  const slideX = interpolate(slideProgress, [0, 1], [-120, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 80,
        // 上から薄いグラデーション暗幕でテキスト視認性を確保
        background:
          'linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.36) 70%, transparent 100%)',
        paddingTop: 28,
        paddingBottom: 28,
        paddingLeft: 36,
        paddingRight: 36,
      }}
    >
      {/* 動画タイトル（常時 / 小さめ / ゴールド） */}
      <div
        style={{
          fontFamily: DESIGN.fonts.heading,
          fontSize: 30,
          fontWeight: 900,
          color: DESIGN.colors.accentGold,
          letterSpacing: 1,
          textShadow: '2px 2px 0 rgba(0,0,0,0.9)',
          marginBottom: 10,
          lineHeight: 1.25,
        }}
      >
        {episodeTitle}
      </div>

      {/* セクション名バッジ（スライドイン） */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transform: `translateX(${slideX}px)`,
        }}
      >
        {/* セクション番号 */}
        <div
          style={{
            background: DESIGN.colors.accentCyan,
            color: DESIGN.colors.primaryBg,
            fontFamily: DESIGN.fonts.number,
            fontSize: 22,
            fontWeight: 900,
            width: 44,
            height: 44,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {sectionNumber}
        </div>

        {/* セクション名テキスト */}
        <div
          style={{
            background: 'rgba(0,229,255,0.15)',
            border: `1.5px solid ${DESIGN.colors.accentCyan}80`,
            borderRadius: 24,
            padding: '6px 20px',
            fontFamily: DESIGN.fonts.heading,
            fontSize: 26,
            fontWeight: 800,
            color: DESIGN.colors.textWhite,
            textShadow: '1px 1px 0 rgba(0,0,0,0.8)',
            letterSpacing: 0.5,
          }}
        >
          {sectionName}
        </div>

        {/* 進行インジケーター（小さいドット列） */}
        <div style={{ display: 'flex', gap: 6, marginLeft: 4 }}>
          {Array.from({ length: totalSections }).map((_, i) => (
            <div
              key={i}
              style={{
                width: i === sectionNumber - 1 ? 20 : 8,
                height: 8,
                borderRadius: 4,
                background:
                  i === sectionNumber - 1
                    ? DESIGN.colors.accentCyan
                    : `${DESIGN.colors.accentCyan}40`,
                transition: 'width 0.3s',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
