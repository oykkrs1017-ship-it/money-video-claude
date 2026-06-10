import React from 'react';
import { useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { ScriptLine, SubtitleStyleType, TimelineEntry } from '../utils/types';

interface SubtitleLayerProps {
  currentLine: ScriptLine | null | undefined;
  currentEntry: TimelineEntry | null | undefined;
  subtitleStyle: SubtitleStyleType;
}

export const SubtitleLayer: React.FC<SubtitleLayerProps> = ({
  currentLine,
  currentEntry,
  subtitleStyle,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!currentLine || !currentEntry) return null;

  const localFrame = frame - currentEntry.startFrame;
  const totalFrames = currentEntry.endFrame - currentEntry.startFrame;
  const speakerColor = currentLine.speaker === 'ponchan' ? '#22c55e' : '#ef4444';
  const whiteOutline = '6px 6px 0 #fff, -6px -6px 0 #fff, 6px -6px 0 #fff, -6px 6px 0 #fff, 0 6px 0 #fff, 6px 0 0 #fff, -6px 0 0 #fff, 0 -6px 0 #fff, 4px 4px 0 #fff, -4px -4px 0 #fff, 4px -4px 0 #fff, -4px 4px 0 #fff';

  // 1ページあたりの文字数（42px・幅60%・約25文字/行×2行）
  const CHARS_PER_PAGE = 50;
  // 行頭禁則文字：これらが次ページの先頭に来ないよう前ページに吸収する
  const NO_LINE_START = new Set(['。', '、', '！', '？', '…', '」', '』', '）', ')', '．', '！', '？', '。', '、']);
  const text = currentLine.text;
  const totalChars = text.length;
  const pages: string[] = [];
  let pos = 0;
  while (pos < text.length) {
    let end = Math.min(pos + CHARS_PER_PAGE, text.length);
    // 次ページ先頭が禁則文字なら現ページに吸収（最大3文字）
    let absorbed = 0;
    while (end < text.length && NO_LINE_START.has(text[end]) && absorbed < 3) {
      end++;
      absorbed++;
    }
    pages.push(text.slice(pos, end));
    pos = end;
  }

  // 文字数の比率でページ切り替えフレームを計算（等分ではなく文字数比例）
  const pageSwitchFrames = pages.map((_, pi) => {
    const charOffset = pi * CHARS_PER_PAGE;
    return Math.floor((charOffset / totalChars) * totalFrames);
  });

  // 現在フレームがどのページか判定
  let pageIndex = 0;
  for (let pi = pages.length - 1; pi >= 0; pi--) {
    if (localFrame >= pageSwitchFrames[pi]) {
      pageIndex = pi;
      break;
    }
  }
  const displayText = pages[pageIndex];

  // ページ切り替えのたびにフェードイン
  const pageLocalFrame = localFrame - pageSwitchFrames[pageIndex];
  const fadeIn = spring({ frame: pageLocalFrame, fps, config: { damping: 25, stiffness: 200 } });

  // shorts: ビジュアルゾーン下端（top:50%=y960）の直下・中央ギャップに配置
  // shorts-no-char: キャラなし版。スライドtop:28%+高さ577px=下端58%の直下に配置
  const positionStyle = subtitleStyle === 'shorts'
    ? { top: 'calc(55% + 8px)' as const }
    : subtitleStyle === 'shorts-no-char'
    ? { top: 'calc(59% + 8px)' as const }
    : { bottom: (subtitleStyle === 'cinematic' ? 'calc(22% - 190px)' : 'calc(18% - 190px)') as string };

  return (
    <div style={{
      position: 'absolute',
      ...positionStyle,
      left: (subtitleStyle === 'shorts' || subtitleStyle === 'shorts-no-char') ? '5%' : '20%',
      right: (subtitleStyle === 'shorts' || subtitleStyle === 'shorts-no-char') ? '5%' : '20%',
      textAlign: 'center',
      opacity: fadeIn,
      transform: `translateY(${interpolate(fadeIn, [0, 1], [20, 0])}px)`,
      zIndex: 80,
    }}>
      <div style={{
        color: speakerColor,
        fontSize: 56,
        fontWeight: 900,
        lineHeight: 1.55,
        letterSpacing: '0.02em',
        textShadow: whiteOutline,
        textAlign: 'center',
        maxHeight: '174px',
        overflow: 'hidden',
      }}>
        {displayText}
      </div>
    </div>
  );
};

export default SubtitleLayer;
