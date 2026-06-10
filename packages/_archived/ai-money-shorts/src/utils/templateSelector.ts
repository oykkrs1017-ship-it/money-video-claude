import { CompositionType } from '../types/episode';

const ALL_TYPES: CompositionType[] = [
  'TypeA-Mystery',
  'TypeB-Ranking',
  'TypeC-Versus',
  'TypeD-Quiz',
  'TypeE-Story',
  'TypeF-NewsFlash',
  'TypeG-MythBuster',
];

export function selectRandomType(): CompositionType {
  return ALL_TYPES[Math.floor(Math.random() * ALL_TYPES.length)];
}

export function getCompositionId(type: CompositionType): string {
  return type;
}

export function getAllTypes(): CompositionType[] {
  return [...ALL_TYPES];
}

/**
 * バッチ処理用: 5種が重複しないようランダム割り当て
 */
export function assignTypesForBatch(count: number): CompositionType[] {
  const shuffled = [...ALL_TYPES].sort(() => Math.random() - 0.5);
  const result: CompositionType[] = [];
  for (let i = 0; i < count; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}
