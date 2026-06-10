/**
 * CharacterLayer.tsx
 * variationEngine の characterLayout に応じてキャラクター配置を制御する。
 *
 * layout:
 *   'left-right'    … pon 左固定 / maro 右固定（デフォルト）
 *   'bottom-center' … 両者を内側に寄せ、話者が若干前（scale 大）に出る
 *   'alternating'   … セクション index が偶数で pon 左、奇数で pon 右
 */

import React from 'react';
import { Character } from './Character';
import type { CharacterLayoutType } from '../utils/variationEngine';
import type { TimelineEntry } from '../compositions/shared/buildTimeline';

interface CharacterLayerProps {
  layout: CharacterLayoutType;
  currentEntry: TimelineEntry | null;
  /** alternating レイアウトで左右を判定するセクションインデックス */
  sectionIndex?: number;
}

/** layout から pon / maro の position を決定する
 *  alternating は廃止（セクション境界でキャラがジャンプするため）
 *  left-right / bottom-center のみ使用
 */
function resolvePositions(
  _layout: CharacterLayoutType,
): { pon: 'left' | 'right'; maro: 'left' | 'right' } {
  return { pon: 'left', maro: 'right' };
}

export const CharacterLayer: React.FC<CharacterLayerProps> = ({
  layout,
  currentEntry,
  sectionIndex = 0,
}) => {
  const { pon: ponPos, maro: maroPos } = resolvePositions(layout);

  const ponSpeaking  = currentEntry?.line.character === 'pon';
  const maroSpeaking = currentEntry?.line.character === 'maro';

  // currentEntry が null（セリフ間など）→ 両者アクティブ扱い
  const ponActive  = !currentEntry || ponSpeaking;
  const maroActive = !currentEntry || maroSpeaking;

  // bottom-center: 内側オフセットを CSS で追加する
  const bottomCenterStyle: React.CSSProperties =
    layout === 'bottom-center'
      ? {
          position: 'absolute',
          inset: 0,
          // 両キャラを内側に 120px ずつ押し込む
          paddingLeft:  120,
          paddingRight: 120,
          pointerEvents: 'none',
        }
      : {};

  if (layout === 'bottom-center') {
    return (
      <div style={bottomCenterStyle}>
        <Character
          characterId="pon"
          expression={ponSpeaking ? currentEntry!.line.expression : 'normal'}
          isSpeaking={ponSpeaking}
          isActive={ponActive}
          position={ponPos}
          startFrame={0}
        />
        <Character
          characterId="maro"
          expression={maroSpeaking ? currentEntry!.line.expression : 'normal'}
          isSpeaking={maroSpeaking}
          isActive={maroActive}
          position={maroPos}
          startFrame={0}
        />
      </div>
    );
  }

  // left-right / alternating: Character をそのまま描画（AbsoluteFill 内の絶対配置に任せる）
  return (
    <>
      <Character
        characterId="pon"
        expression={ponSpeaking ? currentEntry!.line.expression : 'normal'}
        isSpeaking={ponSpeaking}
        isActive={ponActive}
        position={ponPos}
        startFrame={0}
      />
      <Character
        characterId="maro"
        expression={maroSpeaking ? currentEntry!.line.expression : 'normal'}
        isSpeaking={maroSpeaking}
        isActive={maroActive}
        position={maroPos}
        startFrame={0}
      />
    </>
  );
};
