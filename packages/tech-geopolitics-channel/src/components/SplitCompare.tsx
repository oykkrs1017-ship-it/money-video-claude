import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';

export interface CompareItem {
  label: string;           // 国名・企業名
  value: number;           // 主要指標の数値
  unit?: string;           // 単位（兆円、%など）
  subLabel?: string;       // サブテキスト（例: "時価総額"）
  color?: string;          // 強調色
  metrics?: { key: string; value: string }[]; // 追加指標リスト
}

interface SplitCompareProps {
  left: CompareItem;
  right: CompareItem;
  title?: string;
  /** アニメーション開始フレーム */
  startFrame?: number;
  width?: number;
  height?: number;
}

export const SplitCompare: React.FC<SplitCompareProps> = ({
  left,
  right,
  title,
  startFrame = 0,
  width = 960,
  height = 400,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = frame - startFrame;

  if (localFrame < 0) return null;

  // 左パネルがスライドイン
  const leftSlide = spring({ frame: localFrame, fps, config: { damping: 20, stiffness: 100 } });
  // 右パネルは少し遅れてスライドイン
  const rightSlide = spring({ frame: Math.max(0, localFrame - 6), fps, config: { damping: 20, stiffness: 100 } });
  // 中央の仕切り線
  const dividerScale = spring({ frame: Math.max(0, localFrame - 3), fps, config: { damping: 18, stiffness: 120 } });

  // 数値カウントアップアニメーション
  const leftValue = interpolate(leftSlide, [0, 1], [0, left.value]);
  const rightValue = interpolate(rightSlide, [0, 1], [0, right.value]);

  const leftColor = left.color ?? '#4a8fc4';
  const rightColor = right.color ?? '#c4624a';

  const panelW = (width - 4) / 2;

  const formatValue = (val: number, item: CompareItem) => {
    const rounded = Number.isInteger(item.value)
      ? Math.round(val)
      : Math.round(val * 10) / 10;
    return `${rounded}${item.unit ?? ''}`;
  };

  return (
    <div style={{ width, height, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      {/* タイトル */}
      {title && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          textAlign: 'center', padding: '8px 0',
          fontSize: 18, fontWeight: 700, color: '#fff',
          textShadow: '0 1px 4px rgba(0,0,0,0.8)',
          opacity: leftSlide, zIndex: 10,
        }}>
          {title}
        </div>
      )}

      {/* 左パネル */}
      <div style={{
        position: 'absolute',
        left: 0, top: title ? 38 : 0,
        width: panelW,
        bottom: 0,
        background: `linear-gradient(135deg, ${leftColor}22, ${leftColor}44)`,
        border: `2px solid ${leftColor}66`,
        borderRadius: '12px 0 0 12px',
        transform: `translateX(${interpolate(leftSlide, [0, 1], [-panelW, 0])}px)`,
        opacity: leftSlide,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 24px',
        boxSizing: 'border-box',
      }}>
        {/* 国/企業名 */}
        <div style={{ fontSize: 22, fontWeight: 900, color: leftColor, marginBottom: 4,
          textShadow: `0 0 20px ${leftColor}88` }}>
          {left.label}
        </div>
        {left.subLabel && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            {left.subLabel}
          </div>
        )}
        {/* メイン数値 */}
        <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1,
          textShadow: `0 0 30px ${leftColor}` }}>
          {formatValue(leftValue, left)}
        </div>
        {/* サブ指標 */}
        {left.metrics && (
          <div style={{ marginTop: 12, width: '100%' }}>
            {left.metrics.map((m, i) => {
              const mSlide = spring({ frame: Math.max(0, localFrame - 10 - i * 4), fps, config: { damping: 20, stiffness: 120 } });
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, color: 'rgba(255,255,255,0.8)',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  padding: '4px 0',
                  opacity: mSlide,
                  transform: `translateX(${interpolate(mSlide, [0, 1], [-20, 0])}px)`,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{m.key}</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{m.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 中央仕切り線 + VS */}
      <div style={{
        position: 'absolute',
        left: panelW,
        top: title ? 38 : 0,
        bottom: 0,
        width: 4,
        background: 'rgba(255,255,255,0.3)',
        transform: `scaleY(${dividerScale})`,
        transformOrigin: 'top',
        zIndex: 5,
      }} />
      <div style={{
        position: 'absolute',
        left: panelW - 22,
        top: '50%',
        transform: `translateY(-50%) scale(${dividerScale})`,
        width: 44, height: 44,
        borderRadius: '50%',
        background: 'rgba(20,20,20,0.9)',
        border: '2px solid rgba(255,255,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 900, color: '#fff',
        zIndex: 6,
      }}>
        VS
      </div>

      {/* 右パネル */}
      <div style={{
        position: 'absolute',
        right: 0, top: title ? 38 : 0,
        width: panelW,
        bottom: 0,
        background: `linear-gradient(135deg, ${rightColor}22, ${rightColor}44)`,
        border: `2px solid ${rightColor}66`,
        borderRadius: '0 12px 12px 0',
        transform: `translateX(${interpolate(rightSlide, [0, 1], [panelW, 0])}px)`,
        opacity: rightSlide,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 24px',
        boxSizing: 'border-box',
      }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: rightColor, marginBottom: 4,
          textShadow: `0 0 20px ${rightColor}88` }}>
          {right.label}
        </div>
        {right.subLabel && (
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            {right.subLabel}
          </div>
        )}
        <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1,
          textShadow: `0 0 30px ${rightColor}` }}>
          {formatValue(rightValue, right)}
        </div>
        {right.metrics && (
          <div style={{ marginTop: 12, width: '100%' }}>
            {right.metrics.map((m, i) => {
              const mSlide = spring({ frame: Math.max(0, localFrame - 10 - i * 4), fps, config: { damping: 20, stiffness: 120 } });
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  fontSize: 13, color: 'rgba(255,255,255,0.8)',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  padding: '4px 0',
                  opacity: mSlide,
                  transform: `translateX(${interpolate(mSlide, [0, 1], [20, 0])}px)`,
                }}>
                  <span style={{ color: 'rgba(255,255,255,0.55)' }}>{m.key}</span>
                  <span style={{ fontWeight: 700, color: '#fff' }}>{m.value}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SplitCompare;
