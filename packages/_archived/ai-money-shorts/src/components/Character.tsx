import React from 'react';
import { Img, staticFile, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { CharacterID, Expression, CHARACTER_CONFIGS } from '../types/character';
import { Z } from '../styles/zIndex';

// CharacterID → 実際の画像フォルダ名マッピング
const CHAR_DIR: Record<CharacterID, string> = {
  pon: 'ponchan',
  maro: 'maro',
};

// 利用可能なファイル一覧（public/characters/ 配下）
const AVAILABLE_FILES: Record<CharacterID, string[]> = {
  pon: [
    'ponchan_open.png', 'ponchan_close.png',
    'ponchan_happy.png', 'ponchan_angry.png', 'ponchan_sad.png',
  ],
  maro: [
    'maro_open.png', 'maro_close.png',
    'maro_happy.png', 'maro_angry.png', 'maro_sad.png',
  ],
};

/**
 * 表情 + 口パク状態から実際のファイル名を解決する
 * 存在しない表情はデフォルト（open/close）にフォールバック
 */
function resolveImageFile(characterId: CharacterID, expression: Expression, mouthOpen: boolean): string {
  const dir = CHAR_DIR[characterId];
  const files = AVAILABLE_FILES[characterId];
  const state = mouthOpen ? 'open' : 'close';

  // 表情別ファイルを優先
  const expressionMap: Partial<Record<Expression, string>> = {
    happy:     `${dir}_happy.png`,
    excited:   `${dir}_happy.png`,  // excited は happy で代用
    angry:     `${dir}_angry.png`,
    sad:       `${dir}_sad.png`,
  };

  const expressionFile = expressionMap[expression];
  if (expressionFile && files.includes(expressionFile)) {
    return `characters/${dir}/${expressionFile}`;
  }

  // normal / surprised / thinking / smug → 口パク open/close
  const defaultFile = `${dir}_${state}.png`;
  if (files.includes(defaultFile)) {
    return `characters/${dir}/${defaultFile}`;
  }

  // 最終フォールバック
  return `characters/${dir}/${dir}_open.png`;
}

interface CharacterProps {
  characterId: CharacterID;
  expression?: Expression;
  isSpeaking?: boolean;
  isActive?: boolean; // 話者かどうか（非話者はdimming）
  position?: 'left' | 'right';
  startFrame?: number;
}

export const Character: React.FC<CharacterProps> = ({
  characterId,
  expression = 'normal',
  isSpeaking = false,
  isActive = true,
  position = 'left',
  startFrame = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  // キャラクター画像は669x373px横長。Shorts(1080px)での表示サイズ
  // width基準で制御し、高さは自動（aspect ratio維持）
  const CHAR_WIDTH = 520;

  // スライドイン（登場アニメーション 0.5秒）
  const slideProgress = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 12, stiffness: 200, mass: 0.8 },
    durationInFrames: Math.floor(fps * 0.5),
  });
  const slideOffset = interpolate(
    slideProgress,
    [0, 1],
    [position === 'left' ? -CHAR_WIDTH : CHAR_WIDTH, 0],
  );

  // アイドルアニメーション（呼吸）
  const bounceY = isSpeaking
    ? interpolate(Math.sin(frame * 0.35), [-1, 1], [-6, 6])   // 話者：大きく弾む
    : Math.sin(relativeFrame * 0.04) * 3;                      // 非話者：ゆっくり呼吸

  // 口パク（isSpeaking 時、約 6fps で開閉）
  const mouthOpen = isSpeaking && Math.floor(frame / 5) % 2 === 0;

  // 話者 scale: アクティブ 1.0 / 非アクティブ 0.82（より差をつける）
  const targetOpacity = isActive ? 1 : 0.45;
  const targetScale   = isActive ? 1.0 : 0.82;

  // scale / opacity をフレーム基準でスムーズに遷移（8フレーム）
  const activeProgress = spring({
    frame: relativeFrame,
    fps,
    config: { damping: 14, stiffness: 180 },
    durationInFrames: 8,
  });
  const opacity = isActive
    ? interpolate(activeProgress, [0, 1], [0.45, 1])
    : interpolate(activeProgress, [0, 1], [1, 0.45]);
  const liveScale = isActive
    ? interpolate(activeProgress, [0, 1], [0.82, 1.0])
    : interpolate(activeProgress, [0, 1], [1.0, 0.82]);

  const imageSrc = resolveImageFile(characterId, expression, mouthOpen);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 185,
        [position]: slideOffset,
        transform: `translateY(${bounceY}px) scale(${liveScale})`,
        transformOrigin: position === 'left' ? 'bottom left' : 'bottom right',
        width: CHAR_WIDTH,
        overflow: 'visible',
        opacity,
        transition: 'none',
        zIndex: Z.CHARACTER,
      }}
    >
      <Img
        src={staticFile(imageSrc)}
        style={{
          width: '100%',
          height: 'auto',
        }}
      />
    </div>
  );
};
