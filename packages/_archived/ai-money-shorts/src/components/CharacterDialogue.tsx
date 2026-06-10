import React from 'react';
import { useCurrentFrame, Audio, staticFile } from 'remotion';
import { DialogueLine, VisualElement } from '../types/episode';
import { CHARACTER_CONFIGS } from '../types/character';
import { DESIGN } from '../styles/designSystem';

interface CharacterDialogueProps {
  line: DialogueLine;
  startFrame: number;
  visuals?: VisualElement[];
}

/** 話者ごとのボーダーカラー */
const SPEAKER_COLOR: Record<string, string> = {
  pon:  DESIGN.colors.accentPink,
  maro: DESIGN.colors.accentCyan,
};

/** 感情ごとのグロー設定 */
function getEmotionGlow(expression: string, speakerColor: string): string {
  switch (expression) {
    case 'excited':
    case 'happy':
      return `0 0 24px ${DESIGN.colors.accentGold}80, 0 0 8px ${speakerColor}60`;
    case 'angry':
      return `0 0 24px ${DESIGN.colors.warningOrange}80`;
    case 'surprised':
      return `0 0 18px ${speakerColor}70`;
    default:
      return `0 0 12px ${speakerColor}40`;
  }
}

export const CharacterDialogue: React.FC<CharacterDialogueProps> = ({
  line,
  startFrame,
  visuals = [],
}) => {
  const frame = useCurrentFrame();
  const relativeFrame = frame - startFrame;
  const durationFrames = line.durationFrames ?? 60;

  // テキストのタイプライター効果
  const charsToShow = Math.min(
    line.text.length,
    Math.floor((relativeFrame / (durationFrames * 0.5)) * line.text.length),
  );
  const displayText = line.text.slice(0, charsToShow);

  const speakerColor = SPEAKER_COLOR[line.character] ?? DESIGN.colors.accentCyan;
  const bubbleGlow = getEmotionGlow(line.expression, speakerColor);
  const speakerName = CHARACTER_CONFIGS[line.character].name;

  // 話者の吹き出しポインター方向（pon=左、maro=右）
  const isLeft = line.character === 'pon';

  return (
    <div>

      {/* 吹き出し */}
      <div
        style={{
          position: 'absolute',
          bottom: 440,
          left: 40,
          right: 40,
          background: 'rgba(10,14,39,0.92)',
          border: `2px solid ${speakerColor}`,
          borderRadius: 20,
          padding: '20px 28px',
          backdropFilter: 'blur(8px)',
          boxShadow: bubbleGlow,
        }}
      >
        {/* 話者ラベル（カラーバッジ） */}
        <div
          style={{
            display: 'inline-block',
            background: speakerColor,
            color: DESIGN.colors.primaryBg,
            fontSize: 18,
            fontWeight: 900,
            fontFamily: DESIGN.fonts.body,
            padding: '2px 14px',
            borderRadius: 20,
            marginBottom: 10,
          }}
        >
          {speakerName}
        </div>

        {/* セリフテキスト */}
        <div
          style={{
            fontFamily: DESIGN.fonts.body,
            fontSize: 34,
            fontWeight: 700,
            color: DESIGN.colors.textWhite,
            lineHeight: 1.45,
            wordBreak: 'break-all',
          }}
        >
          {displayText}
        </div>

        {/* 吹き出しポインター（三角形） */}
        <div
          style={{
            position: 'absolute',
            bottom: -14,
            [isLeft ? 'left' : 'right']: 60,
            width: 0,
            height: 0,
            borderLeft: '12px solid transparent',
            borderRight: '12px solid transparent',
            borderTop: `14px solid ${speakerColor}`,
          }}
        />
      </div>

      {/* 音声 */}
      {line.audioFile && (
        <Audio src={staticFile(line.audioFile)} startFrom={0} volume={1} />
      )}
    </div>
  );
};
