// Phase 1 rewire: VariationEngine の実体は @money-video/domain に移管済み。
// このファイルは既存 import との後方互換のための薄い re-export。
export { getVariation } from '@money-video/domain';
export type {
  VariationConfig,
  ThemeType,
  TitleStyleType,
  CharacterLayoutType,
  SubtitleStyleType,
  TransitionType,
  BackgroundType,
} from '@money-video/domain';

import { getVariation } from '@money-video/domain';
export default getVariation;
