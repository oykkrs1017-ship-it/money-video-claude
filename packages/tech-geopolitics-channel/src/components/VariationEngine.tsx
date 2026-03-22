import { VariationConfig, ThemeType, TitleStyleType, CharacterLayoutType, SubtitleStyleType, TransitionType, BackgroundType } from '../utils/types';

const THEMES: ThemeType[] = ['midnight-blue', 'forest-green', 'warm-sunset', 'arctic-white', 'crimson-dark'];
const TITLE_STYLES: TitleStyleType[] = ['slide-left', 'fade-scale', 'typewriter', 'glitch', 'split-reveal'];
const CHARACTER_LAYOUTS: CharacterLayoutType[] = ['left-right', 'bottom-center', 'picture-in-picture', 'alternating'];
const SUBTITLE_STYLES: SubtitleStyleType[] = ['bottom-bar', 'floating', 'highlight-word', 'cinematic'];
const TRANSITIONS: TransitionType[] = ['fade', 'slide', 'zoom', 'wipe', 'dissolve'];
const BACKGROUNDS: BackgroundType[] = ['gradient', 'particles', 'grid', 'wave', 'geometric'];

/**
 * seed文字列から決定論的なハッシュ値を生成する（同じseedなら常に同じ結果）
 */
function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash >>> 0; // 符号なし32bit整数に正規化
  }
  return hash;
}

/**
 * ハッシュ値と配列から決定論的に1要素を選択する
 */
function pick<T>(arr: T[], hash: number, offset: number): T {
  return arr[Math.abs((hash + offset * 2654435769) >>> 0) % arr.length];
}

/**
 * seed値からVariationConfigを決定論的に生成する。
 * 同じseedなら常に同じ演出になる（再現可能）。
 * seedが1文字でも異なれば全く別の演出になる。
 */
export function getVariation(seed: string): VariationConfig {
  const hash = hashSeed(seed);
  return {
    theme:           pick(THEMES,            hash, 0),
    titleStyle:      pick(TITLE_STYLES,      hash, 1),
    characterLayout: pick(CHARACTER_LAYOUTS, hash, 2),
    subtitleStyle:   pick(SUBTITLE_STYLES,   hash, 3),
    transition:      pick(TRANSITIONS,       hash, 4),
    background:      pick(BACKGROUNDS,       hash, 5),
  };
}

export default getVariation;
