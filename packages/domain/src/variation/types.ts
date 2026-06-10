export type ThemeType =
  | 'midnight-blue'
  | 'forest-green'
  | 'warm-sunset'
  | 'arctic-white'
  | 'crimson-dark'
  | 'chalk-board'
  | 'news-white'
  | 'news-blue'
  | 'studio-green';

export type TitleStyleType =
  | 'slide-left'
  | 'fade-scale'
  | 'typewriter'
  | 'glitch'
  | 'split-reveal';

export type CharacterLayoutType =
  | 'left-right'
  | 'bottom-center'
  | 'picture-in-picture'
  | 'alternating';

export type SubtitleStyleType =
  | 'bottom-bar'
  | 'floating'
  | 'highlight-word'
  | 'cinematic'
  | 'shorts'
  | 'shorts-no-char';

export type TransitionType = 'fade' | 'slide' | 'zoom' | 'wipe' | 'dissolve';

export type BackgroundType =
  | 'gradient'
  | 'particles'
  | 'grid'
  | 'wave'
  | 'geometric'
  | 'chalk'
  | 'news-gradient';

export interface VariationConfig {
  theme: ThemeType;
  titleStyle: TitleStyleType;
  characterLayout: CharacterLayoutType;
  subtitleStyle: SubtitleStyleType;
  transition: TransitionType;
  background: BackgroundType;
}
