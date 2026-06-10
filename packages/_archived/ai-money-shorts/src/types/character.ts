/**
 * キャラクター定義は video-settings.yaml が source of truth
 * settings.generated.ts 経由で型安全に参照する
 */
export type {
  CharacterID,
  CharacterConfig,
} from '../settings.generated';

export { CHARACTER_CONFIGS } from '../settings.generated';

export type Expression =
  | 'normal'
  | 'happy'
  | 'surprised'
  | 'thinking'
  | 'angry'
  | 'smug'
  | 'sad'
  | 'excited';

export const EXPRESSION_EMOJI: Record<Expression, string> = {
  normal:    '😊',
  happy:     '😄',
  surprised: '😲',
  thinking:  '🤔',
  angry:     '😤',
  smug:      '😏',
  sad:       '😢',
  excited:   '🤩',
};
