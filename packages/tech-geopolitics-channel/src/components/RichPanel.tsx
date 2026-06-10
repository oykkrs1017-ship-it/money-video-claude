/**
 * RichPanel.tsx
 * 参考画像スタイルの情報密度の高いビジュアルパネル
 * 番号＋大見出し＋本文＋右カラム箇条書きの2カラム構成
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

interface RichPanelProps {
  number?:    number;
  title:      string;
  icon?:      string;
  body?:      string;
  emphasis?:  string;    // body 内のこの文字列をアクセントカラーで強調
  points?:    (string | { text: string; body?: string; value?: string; unit?: string; source?: string })[];
  color?:     string;    // アクセントカラー上書き
  accentColor: string;
  startFrame: number;
  endFrame:   number;
  width:      number;
  /** true のとき top:0 bottom:0 でコンテナを埋める（Shorts用）。false のとき top:'8%' bottom:'38%' */
  fillContainer?: boolean;
}

export const RichPanel: React.FC<RichPanelProps> = ({
  number,
  title,
  icon,
  body,
  emphasis,
  points,
  color,
  accentColor,
  startFrame,
  endFrame,
  width,
  fillContainer = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const accent = color ?? accentColor;
  const elapsed = frame - startFrame;

  // スライドイン＋フェードイン
  const slideIn = spring({ frame: elapsed, fps, config: { damping: 22, stiffness: 120, mass: 0.8 } });
  const translateY = interpolate(slideIn, [0, 1], [40, 0]);
  const opacity = interpolate(elapsed, [0, 15], [0, 1], { extrapolateRight: 'clamp' });

  // 番号ボックス: elastic spring でポップイン（オーバーシュート付き）
  const numberSpring = spring({ frame: elapsed, fps, config: { damping: 8, stiffness: 320, mass: 0.6 } });
  const numberScale = interpolate(numberSpring, [0, 1], [0.25, 1]);
  const numberOpacity = interpolate(elapsed, [0, 8], [0, 1], { extrapolateRight: 'clamp' });

  // フェードアウト
  const fadeOut = interpolate(frame, [endFrame - fps * 0.5, endFrame], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const finalOpacity = opacity * fadeOut;

  // タイトル文字数に応じた動的フォントサイズ（拡大版）
  const titleFontSize = title.length <= 10 ? 56 : title.length <= 16 ? 46 : 38;

  // body テキスト内の emphasis を色付きスパンに置換し、\n を改行に変換
  const renderBody = (text: string) => {
    // \n で行分割して改行を挿入する内部ヘルパー
    const renderWithLineBreaks = (segment: string, key: string | number) => {
      const lines = segment.split('\n');
      return (
        <React.Fragment key={key}>
          {lines.map((line, li) => (
            <React.Fragment key={li}>
              {line}
              {li < lines.length - 1 && <br />}
            </React.Fragment>
          ))}
        </React.Fragment>
      );
    };

    if (!emphasis || !text.includes(emphasis)) {
      return <span>{renderWithLineBreaks(text, 0)}</span>;
    }
    const parts = text.split(emphasis);
    return (
      <>
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            {renderWithLineBreaks(part, `p${i}`)}
            {i < parts.length - 1 && (
              <span style={{ color: accent, fontWeight: 800 }}>{emphasis}</span>
            )}
          </React.Fragment>
        ))}
      </>
    );
  };

  const hasPoints  = points && points.length > 0;
  const hasBody    = !!body;
  const bodyWidth  = hasPoints ? '55%' : '100%';
  // points数に応じてフォントサイズを動的縮小
  const pointCount = points?.length ?? 0;
  const pointFontSize = pointCount <= 2 ? 36 : pointCount <= 4 ? 28 : 22;
  const bodyFontSize  = pointCount <= 2 ? 38 : pointCount <= 4 ? 32 : 26;

  return (
    <div style={{
      position: 'absolute',
      top: fillContainer ? 0 : '8%',
      bottom: fillContainer ? 0 : '38%',
      left: '50%',
      transform: `translateX(-50%) translateY(${translateY}px)`,
      width,
      opacity: finalOpacity,
      zIndex: 40,
      overflow: 'hidden',
    }}>
      {/* カード本体 */}
      <div style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 24,
        boxShadow: '0 8px 40px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.8)',
        border: `2px solid ${accent}22`,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        {/* 上部アクセントバー */}
        <div style={{ height: 6, background: accent, width: '100%' }} />

        <div style={{ display: 'flex', padding: '28px 40px', gap: 28, alignItems: 'stretch', flex: 1, minHeight: 0 }}>

          {/* 左: 番号 */}
          {number != null && (
            <div style={{
              flexShrink: 0,
              width: 88,
              height: 88,
              borderRadius: 14,
              background: accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 50,
              fontWeight: 900,
              color: '#fff',
              lineHeight: 1,
              boxShadow: `0 4px 16px ${accent}55`,
              transform: `scale(${numberScale})`,
              opacity: numberOpacity,
              transformOrigin: 'center center',
            }}>
              {number}
            </div>
          )}

          {/* 中央: タイトル＋本文 */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            {/* タイトル行 */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
            }}>
              {icon && <span style={{ fontSize: 32 }}>{icon}</span>}
              <span style={{
                fontSize: titleFontSize,
                fontWeight: 800,
                color: '#0D1B2A',
                lineHeight: 1.25,
              }}>
                {title}
              </span>
            </div>

            {/* 本文＋右カラム */}
            {(hasBody || hasPoints) && (
              <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
                {/* 本文 */}
                {hasBody && (
                  <div style={{
                    width: bodyWidth,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                  }}>
                    {/* 内側を block div に包むことで br が flex item に昇格するのを防ぐ */}
                    <div style={{
                      fontSize: bodyFontSize,
                      lineHeight: 1.85,
                      color: '#1A2A3A',
                    }}>
                      {renderBody(body!)}
                    </div>
                  </div>
                )}

                {/* 右カラム: 箇条書き */}
                {hasPoints && (
                  <div style={{
                    flex: 1,
                    background: `${accent}0D`,
                    borderRadius: 12,
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-evenly',
                    gap: 0,
                  }}>
                    {points!.map((pt, i) => {
                      const ptDelay = 8 + i * 6;
                      const ptSpring = spring({
                        frame: Math.max(0, elapsed - ptDelay),
                        fps,
                        config: { damping: 22, stiffness: 180 },
                      });
                      const ptOpacity = interpolate(ptSpring, [0, 0.4], [0, 1], { extrapolateRight: 'clamp' });
                      const ptX = interpolate(ptSpring, [0, 1], [20, 0]);
                      return (
                        <div key={i} style={{
                          display: 'flex',
                          gap: 12,
                          alignItems: 'flex-start',
                          opacity: ptOpacity,
                          transform: `translateX(${ptX}px)`,
                        }}>
                          <span style={{
                            flexShrink: 0,
                            width: 34,
                            height: 34,
                            borderRadius: '50%',
                            background: accent,
                            color: '#fff',
                            fontSize: 18,
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: 2,
                          }}>
                            {i + 1}
                          </span>
                          <span style={{ fontSize: pointFontSize, color: '#1A2A3A', lineHeight: 1.55 }}>
                            {typeof pt === 'string' ? pt : pt.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RichPanel;
