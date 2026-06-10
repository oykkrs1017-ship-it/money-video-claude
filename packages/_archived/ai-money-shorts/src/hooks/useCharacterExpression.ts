import { DialogueLine } from '../types/episode';
import { Expression } from '../types/character';

/**
 * 現在のフレームに対応するセリフ行の表情を返す
 */
export function useCharacterExpression(
  lines: DialogueLine[],
  startFrames: number[],
  currentFrame: number,
  characterId: 'pon' | 'maro',
): Expression {
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.character !== characterId) continue;
    const start = startFrames[i];
    if (currentFrame >= start) return line.expression;
  }
  return 'normal';
}
