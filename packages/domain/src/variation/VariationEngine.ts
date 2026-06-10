import { hashSeed, pick } from './hash';
import type {
  BackgroundType,
  CharacterLayoutType,
  SubtitleStyleType,
  ThemeType,
  TitleStyleType,
  TransitionType,
  VariationConfig,
} from './types';

const TITLE_STYLES: ReadonlyArray<TitleStyleType> = [
  'slide-left',
  'fade-scale',
  'typewriter',
  'glitch',
  'split-reveal',
];

const CHARACTER_LAYOUTS: ReadonlyArray<CharacterLayoutType> = [
  'left-right',
  'bottom-center',
  'picture-in-picture',
  'alternating',
];

const SUBTITLE_STYLES: ReadonlyArray<SubtitleStyleType> = [
  'bottom-bar',
  'floating',
  'highlight-word',
  'cinematic',
];

const TRANSITIONS: ReadonlyArray<TransitionType> = [
  'fade',
  'slide',
  'zoom',
  'wipe',
  'dissolve',
];

const NEWS_THEMES: ReadonlyArray<ThemeType> = [
  'news-white',
  'news-blue',
  'studio-green',
  'arctic-white',
];

const FALLBACK_BACKGROUNDS: ReadonlyArray<BackgroundType> = [
  'gradient',
  'particles',
  'grid',
  'wave',
  'geometric',
];

function resolveBackground(theme: ThemeType, hash: number): BackgroundType {
  if (theme === 'chalk-board') return 'chalk';
  if (NEWS_THEMES.includes(theme)) return 'news-gradient';
  return pick(FALLBACK_BACKGROUNDS, hash, 5);
}

export function getVariation(seed: string): VariationConfig {
  const hash = hashSeed(seed);
  // ニュースチャンネルは権威性のためテーマを news-white に固定（配色のバリエーションはしない）
  const theme: ThemeType = 'news-white';
  return {
    theme,
    titleStyle: pick(TITLE_STYLES, hash, 1),
    characterLayout: pick(CHARACTER_LAYOUTS, hash, 2),
    subtitleStyle: pick(SUBTITLE_STYLES, hash, 3),
    transition: pick(TRANSITIONS, hash, 4),
    background: resolveBackground(theme, hash),
  };
}
