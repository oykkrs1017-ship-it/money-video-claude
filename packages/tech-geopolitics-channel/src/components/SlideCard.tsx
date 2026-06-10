import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { SlideCardData } from '../utils/types';
import { GLASS } from '../styles/glass';

interface SlideCardProps {
  data: SlideCardData;
  startFrame: number;
  endFrame: number;
  accentColor?: string;
  width?: number;
}

// ──────────────────────────────────────────────
// 共通スタイル定数
// ──────────────────────────────────────────────
const BG = GLASS.bg;

// ──────────────────────────────────────────────
// レイアウト別レンダラー
// ──────────────────────────────────────────────

interface LayoutProps {
  data: SlideCardData;
  color: string;
  localFrame: number;
  fps: number;
  endFrame: number;
  frame: number;
}

// bullets レイアウト（改良版）
const BulletsLayout: React.FC<LayoutProps> = ({ data, color, localFrame, fps }) => {
  const TITLE_DELAY = fps * 0.2;
  const BULLET_STAGGER = fps * 0.28;

  const titleEntrance = spring({
    frame: Math.max(0, localFrame - TITLE_DELAY),
    fps,
    config: { damping: 24, stiffness: 200 },
  });

  return (
    <>
      {data.title && (
        <div style={{
          opacity: interpolate(titleEntrance, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(titleEntrance, [0, 1], [-24, 0])}px)`,
          marginBottom: 32,
          paddingBottom: 24,
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
        }}>
          <span style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '0.04em',
            lineHeight: 1.35,
            textShadow: `0 0 30px ${color}66`,
          }}>
            {data.title}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-evenly' }}>
      {(data.bullets ?? []).map((bullet, bi) => {
        const bulletDelay = TITLE_DELAY + fps * 0.35 + bi * BULLET_STAGGER;
        const bulletEntrance = spring({
          frame: Math.max(0, localFrame - bulletDelay),
          fps,
          config: { damping: 22, stiffness: 190 },
        });
        const bulletOpacity = interpolate(bulletEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
        const bulletX = interpolate(bulletEntrance, [0, 1], [-32, 0]);

        return (
          <div key={bi} style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 20,
            opacity: bulletOpacity,
            transform: `translateX(${bulletX}px)`,
          }}>
            <div style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: color,
              marginTop: 16,
              flexShrink: 0,
              boxShadow: `0 0 12px ${color}`,
            }} />
            <span style={{
              fontSize: 40,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.5,
              letterSpacing: '0.02em',
            }}>
              {bullet}
            </span>
          </div>
        );
      })}
      </div>
    </>
  );
};

// compare レイアウト
const CompareLayout: React.FC<LayoutProps> = ({ data, color, localFrame, fps }) => {
  const TITLE_DELAY = fps * 0.15;
  const COL_STAGGER = fps * 0.25;

  const titleEntrance = spring({
    frame: Math.max(0, localFrame - TITLE_DELAY),
    fps,
    config: { damping: 24, stiffness: 200 },
  });

  const leftEntrance = spring({
    frame: Math.max(0, localFrame - fps * 0.3),
    fps,
    config: { damping: 22, stiffness: 180 },
  });

  const rightEntrance = spring({
    frame: Math.max(0, localFrame - fps * 0.3 - COL_STAGGER),
    fps,
    config: { damping: 22, stiffness: 180 },
  });

  const leftColor = data.left?.color ?? '#22c55e';
  const rightColor = data.right?.color ?? '#ef4444';

  const ITEM_STAGGER = fps * 0.2;

  return (
    <>
      {data.title && (
        <div style={{
          opacity: interpolate(titleEntrance, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(titleEntrance, [0, 1], [-24, 0])}px)`,
          marginBottom: 28,
          paddingBottom: 20,
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '0.04em',
            lineHeight: 1.35,
            textShadow: `0 0 30px ${color}66`,
          }}>
            {data.title}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 0, flex: 1 }}>
        {/* 左カラム */}
        <div style={{
          flex: 1,
          paddingRight: 24,
          opacity: interpolate(leftEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(leftEntrance, [0, 1], [-28, 0])}px)`,
        }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: `${leftColor}22`,
            border: `1px solid ${leftColor}55`,
            borderRadius: 8,
            padding: '6px 18px',
            marginBottom: 18,
          }}>
            <span style={{ fontSize: 32, fontWeight: 700, color: leftColor, letterSpacing: '0.03em' }}>
              {data.left?.label ?? ''}
            </span>
          </div>
          {(data.left?.items ?? []).map((item, ii) => {
            const itemDelay = fps * 0.1 + ii * ITEM_STAGGER;
            const itemEntrance = spring({
              frame: Math.max(0, localFrame - fps * 0.3 - itemDelay),
              fps,
              config: { damping: 22, stiffness: 200 },
            });
            return (
              <div key={ii} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                marginBottom: 14,
                opacity: interpolate(itemEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateX(${interpolate(itemEntrance, [0, 1], [-20, 0])}px)`,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: leftColor,
                  marginTop: 13,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${leftColor}`,
                }} />
                <span style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  {item}
                </span>
              </div>
            );
          })}
        </div>

        {/* 縦の仕切り線 */}
        <div style={{
          width: 1,
          backgroundColor: 'rgba(255,255,255,0.15)',
          flexShrink: 0,
          margin: '0 8px',
        }} />

        {/* 右カラム */}
        <div style={{
          flex: 1,
          paddingLeft: 24,
          opacity: interpolate(rightEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(rightEntrance, [0, 1], [28, 0])}px)`,
        }}>
          <div style={{
            display: 'inline-block',
            backgroundColor: `${rightColor}22`,
            border: `1px solid ${rightColor}55`,
            borderRadius: 8,
            padding: '6px 18px',
            marginBottom: 18,
          }}>
            <span style={{ fontSize: 26, fontWeight: 700, color: rightColor, letterSpacing: '0.03em' }}>
              {data.right?.label ?? ''}
            </span>
          </div>
          {(data.right?.items ?? []).map((item, ii) => {
            const itemDelay = fps * 0.15 + ii * ITEM_STAGGER;
            const itemEntrance = spring({
              frame: Math.max(0, localFrame - fps * 0.3 - COL_STAGGER - itemDelay),
              fps,
              config: { damping: 22, stiffness: 200 },
            });
            return (
              <div key={ii} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 14,
                marginBottom: 14,
                opacity: interpolate(itemEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
                transform: `translateX(${interpolate(itemEntrance, [0, 1], [20, 0])}px)`,
              }}>
                <div style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  backgroundColor: rightColor,
                  marginTop: 13,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${rightColor}`,
                }} />
                <span style={{ fontSize: 36, fontWeight: 600, color: 'rgba(255,255,255,0.9)', lineHeight: 1.5 }}>
                  {item}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// numbers レイアウト
const NumbersLayout: React.FC<LayoutProps> = ({ data, color, localFrame, fps }) => {
  const TITLE_DELAY = fps * 0.15;
  const NUM_STAGGER = fps * 0.3;

  const titleEntrance = spring({
    frame: Math.max(0, localFrame - TITLE_DELAY),
    fps,
    config: { damping: 24, stiffness: 200 },
  });

  const numbers = data.numbers ?? [];

  return (
    <>
      {data.title && (
        <div style={{
          opacity: interpolate(titleEntrance, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(titleEntrance, [0, 1], [-24, 0])}px)`,
          marginBottom: 36,
          paddingBottom: 20,
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
          textAlign: 'center',
        }}>
          <span style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '0.04em',
            textShadow: `0 0 30px ${color}66`,
          }}>
            {data.title}
          </span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-around', flex: 1 }}>
        {numbers.map((num, ni) => {
          const numDelay = fps * 0.3 + ni * NUM_STAGGER;
          const numEntrance = spring({
            frame: Math.max(0, localFrame - numDelay),
            fps,
            config: { damping: 20, stiffness: 160 },
          });
          const numOpacity = interpolate(numEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
          const numScale = interpolate(numEntrance, [0, 1], [0.7, 1]);

          return (
            <React.Fragment key={ni}>
              {ni > 0 && (
                <div style={{
                  width: 1,
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  margin: '0 8px',
                  alignSelf: 'stretch',
                }} />
              )}
              <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '12px 16px',
                opacity: numOpacity,
                transform: `scale(${numScale})`,
              }}>
                <span style={{
                  fontSize: 80,
                  fontWeight: 800,
                  color: '#ffffff',
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  textShadow: `0 0 40px ${color}88`,
                }}>
                  {num.value}
                </span>
                <span style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: color,
                  letterSpacing: '0.06em',
                  textAlign: 'center',
                }}>
                  {num.label}
                </span>
                {num.subtext && (
                  <span style={{
                    fontSize: 22,
                    color: 'rgba(255,255,255,0.6)',
                    textAlign: 'center',
                  }}>
                    {num.subtext}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </>
  );
};

// quote レイアウト
const QuoteLayout: React.FC<LayoutProps> = ({ data, color, localFrame, fps }) => {
  const quoteMarkEntrance = spring({
    frame: Math.max(0, localFrame - fps * 0.1),
    fps,
    config: { damping: 20, stiffness: 150 },
  });
  const textEntrance = spring({
    frame: Math.max(0, localFrame - fps * 0.3),
    fps,
    config: { damping: 22, stiffness: 170 },
  });
  const attrEntrance = spring({
    frame: Math.max(0, localFrame - fps * 0.55),
    fps,
    config: { damping: 22, stiffness: 170 },
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'stretch',
      justifyContent: 'center',
      padding: '8px 0',
      minHeight: 160,
    }}>
      {/* 大きな引用符 */}
      <div style={{
        fontSize: 120,
        fontWeight: 900,
        color: color,
        lineHeight: 0.8,
        marginBottom: 8,
        opacity: interpolate(quoteMarkEntrance, [0, 0.5], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `scale(${interpolate(quoteMarkEntrance, [0, 1], [0.5, 1])})`,
        transformOrigin: 'left center',
        userSelect: 'none',
      }}>
        "
      </div>

      {/* 引用テキスト */}
      <div style={{
        opacity: interpolate(textEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `translateY(${interpolate(textEntrance, [0, 1], [20, 0])}px)`,
        marginBottom: 28,
        paddingLeft: 16,
      }}>
        <span style={{
          fontSize: 50,
          fontWeight: 700,
          color: '#ffffff',
          lineHeight: 1.55,
          letterSpacing: '0.02em',
        }}>
          {data.quote ?? ''}
        </span>
      </div>

      {/* attribution */}
      {data.attribution && (
        <div style={{
          opacity: interpolate(attrEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(attrEntrance, [0, 1], [24, 0])}px)`,
          textAlign: 'right',
        }}>
          <span style={{
            fontSize: 26,
            fontWeight: 600,
            color: color,
            letterSpacing: '0.06em',
          }}>
            — {data.attribution}
          </span>
        </div>
      )}
    </div>
  );
};

// steps レイアウト
const StepsLayout: React.FC<LayoutProps> = ({ data, color, localFrame, fps }) => {
  const TITLE_DELAY = fps * 0.15;
  const STEP_STAGGER = fps * 0.3;

  const titleEntrance = spring({
    frame: Math.max(0, localFrame - TITLE_DELAY),
    fps,
    config: { damping: 24, stiffness: 200 },
  });

  const bullets = data.bullets ?? [];

  return (
    <>
      {data.title && (
        <div style={{
          opacity: interpolate(titleEntrance, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateX(${interpolate(titleEntrance, [0, 1], [-24, 0])}px)`,
          marginBottom: 28,
          paddingBottom: 20,
          borderBottom: `1px solid rgba(255,255,255,0.1)`,
        }}>
          <span style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#ffffff',
            letterSpacing: '0.04em',
            lineHeight: 1.35,
            textShadow: `0 0 30px ${color}66`,
          }}>
            {data.title}
          </span>
        </div>
      )}

      {bullets.map((step, si) => {
        const stepDelay = TITLE_DELAY + fps * 0.3 + si * STEP_STAGGER;
        const stepEntrance = spring({
          frame: Math.max(0, localFrame - stepDelay),
          fps,
          config: { damping: 22, stiffness: 185 },
        });
        const stepOpacity = interpolate(stepEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
        const stepX = interpolate(stepEntrance, [0, 1], [-36, 0]);

        return (
          <div key={si} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: si < bullets.length - 1 ? 20 : 0,
            opacity: stepOpacity,
            transform: `translateX(${stepX}px)`,
          }}>
            {/* ステップ番号バッジ */}
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              backgroundColor: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: `0 0 16px ${color}88`,
            }}>
              <span style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#000000',
                lineHeight: 1,
              }}>
                {si + 1}
              </span>
            </div>
            {/* アロー */}
            <span style={{
              fontSize: 22,
              color: `${color}aa`,
              flexShrink: 0,
              fontWeight: 700,
            }}>
              →
            </span>
            {/* テキスト */}
            <span style={{
              fontSize: 38,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.9)',
              lineHeight: 1.5,
              letterSpacing: '0.02em',
            }}>
              {step}
            </span>
          </div>
        );
      })}
    </>
  );
};

// highlight レイアウト
const HighlightLayout: React.FC<LayoutProps> = ({ data, color, localFrame, fps }) => {
  const mainEntrance = spring({
    frame: Math.max(0, localFrame - fps * 0.1),
    fps,
    config: { damping: 18, stiffness: 140 },
  });
  const subEntrance = spring({
    frame: Math.max(0, localFrame - fps * 0.45),
    fps,
    config: { damping: 22, stiffness: 170 },
  });

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '24px 0 16px',
      gap: 24,
      minHeight: 140,
    }}>
      <div style={{
        opacity: interpolate(mainEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
        transform: `scale(${interpolate(mainEntrance, [0, 1], [0.88, 1])})`,
      }}>
        <span style={{
          fontSize: 70,
          fontWeight: 800,
          color: '#ffffff',
          lineHeight: 1.4,
          letterSpacing: '0.02em',
          textShadow: `0 0 40px ${color}cc, 0 0 80px ${color}55`,
          display: 'block',
        }}>
          {data.highlight ?? ''}
        </span>
      </div>

      {data.subtext && (
        <div style={{
          opacity: interpolate(subEntrance, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' }),
          transform: `translateY(${interpolate(subEntrance, [0, 1], [16, 0])}px)`,
        }}>
          <span style={{
            fontSize: 26,
            fontWeight: 500,
            color: 'rgba(255,255,255,0.65)',
            lineHeight: 1.5,
          }}>
            {data.subtext}
          </span>
        </div>
      )}
    </div>
  );
};

// ──────────────────────────────────────────────
// メインコンポーネント
// ──────────────────────────────────────────────

export const SlideCard: React.FC<SlideCardProps> = ({
  data,
  startFrame,
  endFrame,
  accentColor = '#4a9eff',
  width = 1190,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (frame < startFrame || frame > endFrame) return null;

  const localFrame = frame - startFrame;

  // カード全体のフェードイン
  const cardEntrance = spring({
    frame: localFrame,
    fps,
    config: { damping: 26, stiffness: 170, mass: 0.9 },
  });
  const cardOpacity = Math.min(
    interpolate(cardEntrance, [0, 0.2], [0, 1], { extrapolateRight: 'clamp' }),
    interpolate(frame, [endFrame - fps * 0.6, endFrame], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    })
  );
  const cardScale = interpolate(cardEntrance, [0, 1], [0.93, 1]);

  const color = data.color ?? accentColor;
  const layout = data.layout ?? 'bullets';

  const layoutProps: LayoutProps = { data, color, localFrame, fps, endFrame, frame };

  const renderLayout = () => {
    switch (layout) {
      case 'compare':   return <CompareLayout {...layoutProps} />;
      case 'numbers':   return <NumbersLayout {...layoutProps} />;
      case 'quote':     return <QuoteLayout {...layoutProps} />;
      case 'steps':     return <StepsLayout {...layoutProps} />;
      case 'highlight': return <HighlightLayout {...layoutProps} />;
      case 'bullets':
      default:          return <BulletsLayout {...layoutProps} />;
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '8%',
      bottom: '38%',   // キャラクターエリア上端まで伸ばす
      left: '50%',
      width,
      zIndex: 40,
      opacity: cardOpacity,
      transform: `translateX(-50%) scale(${cardScale})`,
    }}>
      <div style={{
        width: '100%',
        height: '100%',
        borderRadius: GLASS.radius,
        border: GLASS.border,
        borderTop: `4px solid ${color}`,
        boxShadow: `${GLASS.shadow}, 0 0 0 1px ${color}33`,
        background: BG,
        backdropFilter: GLASS.blur,
        WebkitBackdropFilter: GLASS.blur,
        padding: '40px 60px 44px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        gap: 0,
        boxSizing: 'border-box',
      }}>
        {renderLayout()}
      </div>
    </div>
  );
};

export default SlideCard;
