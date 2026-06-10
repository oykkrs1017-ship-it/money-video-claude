/**
 * seed ベースの決定論的バリエーションエンジン
 * 同じ seed なら常に同じ演出になる（再現可能・BAN回避）
 * seed が1文字でも異なれば別の演出になる
 */

export type ColorSchemeType =
  | 'dark-gold'
  | 'dark-cyan'
  | 'dark-pink'
  | 'midnight-purple'
  | 'dark-green';

export type TitleAnimationType =
  | 'slide-left'
  | 'fade-scale'
  | 'typewriter'
  | 'bounce'
  | 'glitch';

export type CharacterLayoutType =
  | 'left-right'
  | 'bottom-center'
  | 'alternating';

export type SubtitleStyleType =
  | 'bottom-bar'
  | 'floating'
  | 'highlight-word'
  | 'cinematic'
  | 'shorts';

export type TransitionType =
  | 'fade'
  | 'slide'
  | 'zoom'
  | 'wipe';

export type TelopStyleType =
  | 'neon'
  | 'stamp'
  | 'minimal'
  | 'handwritten';

export interface ShortsVariationConfig {
  colorScheme: ColorSchemeType;
  titleAnimation: TitleAnimationType;
  characterLayout: CharacterLayoutType;
  subtitleStyle: SubtitleStyleType;
  transition: TransitionType;
  telopStyle: TelopStyleType;
  /** カラースキームに対応した背景色 */
  bgColor: string;
  /** アクセントカラー */
  accentColor: string;
}

// ── バリエーション候補リスト ──────────────────────────────────────────────

const COLOR_SCHEMES: ColorSchemeType[] = [
  'dark-gold',
  'dark-cyan',
  'dark-pink',
  'midnight-purple',
  'dark-green',
];

const TITLE_ANIMATIONS: TitleAnimationType[] = [
  'slide-left',
  'fade-scale',
  'typewriter',
  'bounce',
  'glitch',
];

const CHARACTER_LAYOUTS: CharacterLayoutType[] = [
  'left-right',
  'bottom-center',
  'alternating',
];

const SUBTITLE_STYLES: SubtitleStyleType[] = [
  'bottom-bar',
  'floating',
  'highlight-word',
];

const TRANSITIONS: TransitionType[] = ['fade', 'slide', 'zoom', 'wipe'];

const TELOP_STYLES: TelopStyleType[] = ['neon', 'stamp', 'minimal', 'handwritten'];

// ── カラースキーム定義 ──────────────────────────────────────────────────

const COLOR_SCHEME_MAP: Record<ColorSchemeType, { bg: string; accent: string }> = {
  'dark-gold':       { bg: '#0A0E27', accent: '#FFD700' },
  'dark-cyan':       { bg: '#050D1A', accent: '#00E5FF' },
  'dark-pink':       { bg: '#1A0A1A', accent: '#FF6B9D' },
  'midnight-purple': { bg: '#0D0A1A', accent: '#BB86FC' },
  'dark-green':      { bg: '#0A1A0A', accent: '#4CAF50' },
};

// ── ハッシュ関数（djb2 変形） ──────────────────────────────────────────

function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash >>> 0; // 符号なし32bit整数
  }
  return hash;
}

function pick<T>(arr: T[], hash: number, offset: number): T {
  return arr[Math.abs((hash + offset * 2654435769) >>> 0) % arr.length];
}

// ── メインエクスポート ──────────────────────────────────────────────────

/**
 * seed 文字列から決定論的に演出設定を生成する
 * @param seed エピソードID や動画IDを使用（例: "ep-20240401-001"）
 */
export function getVariation(seed: string): ShortsVariationConfig {
  const hash = hashSeed(seed);
  const colorScheme = pick(COLOR_SCHEMES, hash, 0);
  const { bg, accent } = COLOR_SCHEME_MAP[colorScheme];

  return {
    colorScheme,
    titleAnimation:   pick(TITLE_ANIMATIONS,    hash, 1),
    characterLayout:  pick(CHARACTER_LAYOUTS,   hash, 2),
    subtitleStyle:    pick(SUBTITLE_STYLES,     hash, 3),
    transition:       pick(TRANSITIONS,         hash, 4),
    telopStyle:       pick(TELOP_STYLES,        hash, 5),
    bgColor:          bg,
    accentColor:      accent,
  };
}

export default getVariation;
