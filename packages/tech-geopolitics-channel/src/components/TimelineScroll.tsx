import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export interface TimelineEvent {
  year: string;           // "2017" や "2020年Q3" など
  label: string;          // イベント名
  description?: string;   // 補足説明（1〜2行）
  highlight?: boolean;    // 強調表示
  color?: string;         // 個別の色指定
}

interface TimelineScrollProps {
  events: TimelineEvent[];
  title?: string;
  /** アニメーション開始フレーム */
  startFrame?: number;
  /** スクロール速度（px/frame） デフォルト 1.5 */
  scrollSpeed?: number;
  /** アクティブにするイベントのインデックス（ナレーション同期） */
  activeIndex?: number;
  accentColor?: string;
  textColor?: string;
  width?: number;
  height?: number;
}

const NODE_SPACING = 280; // イベント間隔（px）
const NODE_RADIUS = 14;

export const TimelineScroll: React.FC<TimelineScrollProps> = ({
  events,
  title,
  startFrame = 0,
  scrollSpeed = 1.5,
  activeIndex,
  accentColor = '#4a9eff',
  textColor = '#ffffff',
  width = 1200,
  height = 220,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);

  // 全体フェードイン
  const fadeIn = spring({
    frame: localFrame,
    fps,
    config: { damping: 25, stiffness: 80 },
  });

  // スクロールオフセット（左方向へ流れる）
  const rawScroll = localFrame * scrollSpeed;
  // activeIndex がある場合はそこにフォーカス
  const targetScroll = activeIndex !== undefined
    ? activeIndex * NODE_SPACING - width * 0.3
    : rawScroll;

  // rawScrollとtargetScrollをinterpolateでブレンド
  const scrollX = activeIndex !== undefined
    ? interpolate(
        spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 60 } }),
        [0, 1],
        [0, targetScroll]
      )
    : rawScroll;

  const totalWidth = events.length * NODE_SPACING + width;
  const lineY = height * 0.52;

  return (
    <div style={{
      width,
      height,
      position: 'relative',
      overflow: 'hidden',
      opacity: fadeIn,
    }}>
      {/* タイトル */}
      {title && (
        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 700,
          color: textColor,
          opacity: 0.8,
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          zIndex: 10,
          padding: '6px 0',
        }}>
          {title}
        </div>
      )}

      {/* スクロールコンテナ */}
      <div style={{
        position: 'absolute',
        top: title ? 28 : 0,
        left: 0,
        width: totalWidth,
        height: title ? height - 28 : height,
        transform: `translateX(${-scrollX + width * 0.15}px)`,
      }}>
        {/* メインライン */}
        <svg
          style={{ position: 'absolute', top: 0, left: 0 }}
          width={totalWidth}
          height={height}
        >
          {/* 背景ライン */}
          <line
            x1={0} y1={lineY}
            x2={totalWidth} y2={lineY}
            stroke={`${accentColor}33`}
            strokeWidth={3}
          />
          {/* アクティブまでのハイライトライン */}
          {activeIndex !== undefined && (
            <line
              x1={NODE_SPACING * 0.5}
              y1={lineY}
              x2={NODE_SPACING * 0.5 + activeIndex * NODE_SPACING}
              y2={lineY}
              stroke={accentColor}
              strokeWidth={3}
              opacity={0.7}
            />
          )}

          {events.map((event, i) => {
            const cx = NODE_SPACING * 0.5 + i * NODE_SPACING;
            const isActive = activeIndex === i;
            const isPast = activeIndex !== undefined && i < activeIndex;
            const isFuture = activeIndex !== undefined && i > activeIndex;

            // 各ノードの登場アニメーション
            const nodeDelay = i * 4;
            const nodeSpring = spring({
              frame: Math.max(0, localFrame - nodeDelay),
              fps,
              config: { damping: 18, stiffness: 150 },
            });

            const nodeColor = event.color ?? (isActive ? accentColor : isPast ? `${accentColor}99` : `${accentColor}44`);
            const nodeR = isActive
              ? NODE_RADIUS * 1.4
              : isPast ? NODE_RADIUS : NODE_RADIUS * 0.85;

            return (
              <g key={i}>
                {/* 垂直コネクタ */}
                <line
                  x1={cx} y1={lineY - nodeR}
                  x2={cx} y2={lineY - (i % 2 === 0 ? 70 : 0)}
                  stroke={`${accentColor}44`}
                  strokeWidth={1}
                  strokeDasharray="4 4"
                />

                {/* ノード外周リング（アクティブ時パルス） */}
                {isActive && (
                  <circle
                    cx={cx} cy={lineY}
                    r={interpolate(
                      Math.sin(localFrame * 0.08) * 0.5 + 0.5,
                      [0, 1],
                      [nodeR * 1.4, nodeR * 2.0]
                    )}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={2}
                    opacity={interpolate(
                      Math.sin(localFrame * 0.08) * 0.5 + 0.5,
                      [0, 1], [0.6, 0.1]
                    )}
                  />
                )}

                {/* ノード本体 */}
                <circle
                  cx={cx} cy={lineY}
                  r={interpolate(nodeSpring, [0, 1], [0, nodeR])}
                  fill={isActive ? accentColor : isPast ? `${accentColor}66` : 'rgba(30,30,40,0.9)'}
                  stroke={nodeColor}
                  strokeWidth={isActive ? 3 : 2}
                />

                {/* 完了チェック（過去イベント） */}
                {isPast && nodeSpring > 0.8 && (
                  <text
                    x={cx} y={lineY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={12}
                    fill={accentColor}
                    fontWeight="bold"
                  >✓</text>
                )}

                {/* 年ラベル */}
                <text
                  x={cx}
                  y={lineY + NODE_RADIUS + 20}
                  textAnchor="middle"
                  fill={isActive ? accentColor : isFuture ? `${textColor}55` : `${textColor}99`}
                  fontSize={isActive ? 16 : 13}
                  fontWeight={isActive ? 900 : 600}
                  opacity={nodeSpring}
                >
                  {event.year}
                </text>

                {/* イベント名（上段・偶数インデックス） */}
                {i % 2 === 0 && (
                  <foreignObject
                    x={cx - 110} y={lineY - 115}
                    width={220} height={90}
                  >
                    <div style={{
                      textAlign: 'center',
                      opacity: nodeSpring * (isFuture ? 0.4 : 1),
                      transform: `translateY(${interpolate(nodeSpring, [0, 1], [-10, 0])}px)`,
                    } as React.CSSProperties}>
                      <div style={{
                        fontSize: isActive ? 15 : 13,
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? '#fff' : `${textColor}cc`,
                        textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                        lineHeight: 1.3,
                        padding: isActive ? '4px 8px' : '2px 4px',
                        background: isActive ? `${accentColor}33` : 'transparent',
                        borderRadius: 6,
                        border: isActive ? `1px solid ${accentColor}66` : 'none',
                      }}>
                        {event.label}
                      </div>
                      {event.description && isActive && (
                        <div style={{
                          fontSize: 11,
                          color: `${textColor}88`,
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}>
                          {event.description}
                        </div>
                      )}
                    </div>
                  </foreignObject>
                )}

                {/* イベント名（下段・奇数インデックス） */}
                {i % 2 !== 0 && (
                  <foreignObject
                    x={cx - 110} y={lineY + NODE_RADIUS + 42}
                    width={220} height={90}
                  >
                    <div style={{
                      textAlign: 'center',
                      opacity: nodeSpring * (isFuture ? 0.4 : 1),
                      transform: `translateY(${interpolate(nodeSpring, [0, 1], [10, 0])}px)`,
                    } as React.CSSProperties}>
                      <div style={{
                        fontSize: isActive ? 15 : 13,
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? '#fff' : `${textColor}cc`,
                        textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                        lineHeight: 1.3,
                        padding: isActive ? '4px 8px' : '2px 4px',
                        background: isActive ? `${accentColor}33` : 'transparent',
                        borderRadius: 6,
                        border: isActive ? `1px solid ${accentColor}66` : 'none',
                      }}>
                        {event.label}
                      </div>
                      {event.description && isActive && (
                        <div style={{
                          fontSize: 11,
                          color: `${textColor}88`,
                          marginTop: 4,
                          lineHeight: 1.4,
                        }}>
                          {event.description}
                        </div>
                      )}
                    </div>
                  </foreignObject>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* 左右フェードマスク */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0,
        width: 80,
        background: 'linear-gradient(90deg, rgba(0,0,0,0.8), transparent)',
        pointerEvents: 'none',
        zIndex: 5,
      }} />
      <div style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 80,
        background: 'linear-gradient(-90deg, rgba(0,0,0,0.8), transparent)',
        pointerEvents: 'none',
        zIndex: 5,
      }} />
    </div>
  );
};

export default TimelineScroll;
