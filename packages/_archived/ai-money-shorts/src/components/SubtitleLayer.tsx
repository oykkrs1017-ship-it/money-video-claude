/**
 * SubtitleLayer.tsx
 * セリフ字幕レイヤー。
 * - 1ページ最大15文字でページ分割
 * - 各ページの表示時間は文字数に比例（長い文 = 長く表示）
 * - スピーカー別カラー（pon = 緑、maro = ピンク）
 */
import React from 'react';
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion';
import type { DialogueLine } from '../types/episode';
import { CHARACTER_CONFIGS } from '../settings.generated';
import { Z } from '../styles/zIndex';
import { SETTINGS } from '../settings.generated';

const PAGE_CHARS = 20; // 1ページの最大文字数
// 自然境界文字（ここで切ると読みやすい）
const BREAK_CHARS = new Set(['。', '！', '？', '、', '…', '―', ')', '）', '」']);

/**
 * テキストをページ分割する。
 * 各ページは PAGE_CHARS 文字以内で、可能なら自然境界（句点等）で切る。
 */
function splitIntoPages(text: string): string[] {
  const pages: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= PAGE_CHARS) {
      pages.push(remaining);
      break;
    }

    // PAGE_CHARS の範囲内で自然境界を探す（後ろから）
    let cutAt = PAGE_CHARS;
    for (let i = PAGE_CHARS - 1; i >= PAGE_CHARS - 6; i--) {
      if (BREAK_CHARS.has(remaining[i])) {
        cutAt = i + 1; // 句点の次で切る
        break;
      }
    }

    pages.push(remaining.slice(0, cutAt));
    remaining = remaining.slice(cutAt);
  }

  return pages;
}

interface SubtitleLayerProps {
  line: DialogueLine;
  /** buildTimeline から渡されるローカルフレーム（この Sequence 内の 0 始まり） */
  localFrame: number;
  totalFrames: number;
}

export const SubtitleLayer: React.FC<SubtitleLayerProps> = ({
  line,
  localFrame,
  totalFrames,
}) => {
  const { fps } = useVideoConfig();

  // ページ分割（自然境界優先）
  const text = line.text;
  const pages = splitIntoPages(text);
  if (pages.length === 0) return null;

  // 各ページの表示フレーム数を文字数比例で計算
  const totalChars = text.length;
  const framePerChar = totalFrames / Math.max(totalChars, 1);
  const pageBoundaries: number[] = [0];
  let acc = 0;
  for (const page of pages) {
    acc += Math.round(page.length * framePerChar);
    pageBoundaries.push(acc);
  }

  // 現在のページを特定
  const currentPageIndex = pageBoundaries.findIndex((_, i) => {
    if (i >= pages.length) return false;
    return localFrame >= pageBoundaries[i] && localFrame < pageBoundaries[i + 1];
  });
  const pageIndex = currentPageIndex < 0 ? pages.length - 1 : currentPageIndex;
  const currentPage = pages[pageIndex];
  const pageStartFrame = pageBoundaries[pageIndex] ?? 0;

  const charConfig = CHARACTER_CONFIGS[line.character];
  const speakerColor = charConfig?.color ?? '#ffffff';

  // スライドイン & スプリング
  const localPageFrame = localFrame - pageStartFrame;
  const bounce = spring({
    frame: localPageFrame,
    fps,
    config: { damping: 25, stiffness: 200 },
  });
  const translateY = interpolate(bounce, [0, 1], [30, 0]);

  const { subtitle } = SETTINGS;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: subtitle.bottomOffset,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY}px)`,
        width: `${subtitle.maxWidthPercent}%`,
        zIndex: Z.TELOP,
      }}
    >
      {/* スピーカーカラーの左アクセントバー */}
      <div
        style={{
          borderLeft: `6px solid ${speakerColor}`,
          paddingLeft: 20,
          background: 'rgba(0,0,0,0.72)',
          borderRadius: '0 16px 16px 0',
          padding: '20px 24px 20px 20px',
        }}
      >
        {/* スピーカー名 */}
        <div
          style={{
            color: speakerColor,
            fontSize: subtitle.fontSize * 0.64,
            fontWeight: '700',
            marginBottom: 8,
            fontFamily: 'Noto Sans JP, sans-serif',
            opacity: 0.9,
          }}
        >
          {charConfig?.name ?? line.character}
        </div>

        {/* 字幕テキスト */}
        <div
          style={{
            color: '#ffffff',
            fontSize: subtitle.fontSize,
            fontWeight: subtitle.fontWeight,
            lineHeight: subtitle.lineHeight,
            fontFamily: 'Noto Sans JP, sans-serif',
            textShadow: '0 2px 8px rgba(0,0,0,0.8)',
          }}
        >
          {currentPage}
        </div>
      </div>
    </div>
  );
};

export default SubtitleLayer;
