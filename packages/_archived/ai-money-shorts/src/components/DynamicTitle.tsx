import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { DESIGN } from '../styles/designSystem';
import { Z } from '../styles/zIndex';

/** タイトルがヒーロー（中央大）→ ヘッダー（上部固定）へ遷移するコンポーネント */
interface DynamicTitleProps {
  episodeTitle: string;
  /** このフレームからヘッダーへ遷移開始 */
  pinFrame: number;
}

const TRANSITION = 24; // 遷移フレーム数

export const DynamicTitle: React.FC<DynamicTitleProps> = ({
  episodeTitle,
  pinFrame,
}) => {
  const frame = useCurrentFrame();

  // ── ヒーロー ↔ ヘッダー の進行度（0=ヒーロー, 1=ヘッダー固定）
  const pinProgress = interpolate(frame, [pinFrame, pinFrame + TRANSITION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // ── ヒーロー表示（中央・大文字）
  const heroOpacity = interpolate(frame, [pinFrame, pinFrame + TRANSITION], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // ヒーロー開始時のフェードイン（0-12フレーム）
  const heroFadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // グロー脈動
  const glow = 36 + 18 * Math.sin(frame * 0.18);

  // ── ヘッダー表示（上部固定）
  const headerOpacity = interpolate(frame, [pinFrame, pinFrame + TRANSITION], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <>
      {/* ══ ヒーロータイトル（中央・大） ══ */}
      <div
        style={{
          position: 'absolute',
          top: '38%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '88%',
          textAlign: 'center',
          opacity: heroOpacity * heroFadeIn,
          zIndex: Z.TITLE_HERO,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontFamily: DESIGN.fonts.heading,
            fontSize: 92,
            fontWeight: 900,
            color: DESIGN.colors.accentGold,
            lineHeight: 1.25,
            wordBreak: 'break-all',
            whiteSpace: 'pre-wrap',
            textShadow: [
              `0 0 ${glow}px ${DESIGN.colors.accentGold}`,
              `0 0 ${glow * 2}px ${DESIGN.colors.accentGold}50`,
              '4px 4px 0 rgba(0,0,0,0.95)',
              '-2px 2px 0 rgba(0,0,0,0.95)',
            ].join(', '),
            letterSpacing: 2,
          }}
        >
          {episodeTitle}
        </div>
        {/* サブテキスト（どんな動画かを補足） */}
        <div
          style={{
            marginTop: 24,
            fontFamily: DESIGN.fonts.body,
            fontSize: 32,
            fontWeight: 700,
            color: DESIGN.colors.textGray,
            textShadow: '2px 2px 0 rgba(0,0,0,0.8)',
            opacity: interpolate(frame, [10, 25], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          👆 最後まで見てね
        </div>
      </div>

      {/* ══ ヘッダー（上部固定） ══ */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          opacity: headerOpacity,
          zIndex: Z.TITLE_HEADER,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.4) 72%, transparent 100%)',
          paddingTop: 215,   // YouTube Shorts 上部セーフゾーン205px + 余裕10px
          paddingBottom: 24,
          paddingLeft: 60,   // 左右セーフゾーン50px + 余裕10px
          paddingRight: 60,
          pointerEvents: 'none',
        }}
      >
        {/* エピソードタイトル（小・ゴールド） */}
        <div
          style={{
            fontFamily: DESIGN.fonts.heading,
            fontSize: 28,
            fontWeight: 900,
            color: DESIGN.colors.accentGold,
            letterSpacing: 1,
            textShadow: '2px 2px 0 rgba(0,0,0,0.9)',
            lineHeight: 1.25,
          }}
        >
          {episodeTitle}
        </div>
      </div>
    </>
  );
};
