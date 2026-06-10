// script-input.json の型定義
//
// Phase 1 rewire: ドメイン共通型は @money-video/domain を Single Source of Truth と
// し、このファイルからは re-export する。後方互換のため、legacy 型（VisualLegacy
// 等）のみこのファイルにローカル定義を残している。

export type {
  SpeakerType,
  EmotionType,
  ChapterType,
  ChartType,
  SlideLayout,
  ImagePosition,
  ImageAnimation,
  SlideCompareColumn,
  SlideNumber,
  StatCardData,
  CompareItemData,
  TimelineEventData,
  Visual,
  ScriptLine,
  BgmMap,
  ChartDataPoint,
  ChartDataSet,
  TimelineEntry,
  ThemeType,
  TitleStyleType,
  CharacterLayoutType,
  SubtitleStyleType,
  TransitionType,
  BackgroundType,
  VariationConfig,
} from '@money-video/domain';

import type {
  Chapter as DomainChapter,
  ScriptInput as DomainScriptInput,
  ChartType,
  ImagePosition,
  ImageAnimation,
  SlideCompareColumn,
  SlideNumber,
  StatCardData,
  TimelineEventData,
  SlideLayout,
  ChartDataPoint,
} from '@money-video/domain';

/** @deprecated Use the Visual discriminated union instead */
export type VisualType =
  | 'chart'
  | 'keyword'
  | 'splitCompare'
  | 'timeline'
  | 'split'
  | 'image'
  | 'stat'
  | 'slide';

/** スライドカード（6種類のレイアウト対応） */
export interface SlideCardData {
  layout?: SlideLayout;
  title?: string;
  color?: string;

  bullets?: string[];

  left?: SlideCompareColumn;
  right?: SlideCompareColumn;

  numbers?: SlideNumber[];

  quote?: string;
  attribution?: string;

  highlight?: string;
  subtext?: string;
}

export interface SplitCompareData {
  left: import('../components/SplitCompare').CompareItem;
  right: import('../components/SplitCompare').CompareItem;
  title?: string;
}

/** @deprecated Use the Visual discriminated union field directly */
export interface TimelineData {
  events: TimelineEventData[];
  title?: string;
  activeIndex?: number;
  scrollSpeed?: number;
}

/** @deprecated Use Visual discriminated union { type: 'image'; ... } instead */
export interface ImageData {
  src: string;
  url?: string;
  alt?: string;
  caption?: string;
  position?: ImagePosition;
  width?: number;
  duration?: number;
  animation?: ImageAnimation;
}

/**
 * @deprecated Use the Visual discriminated union instead.
 * 旧 VisualLegacy インターフェースは後方互換のために残している。
 */
export interface VisualLegacy {
  type: VisualType;
  chartType?: ChartType;
  data?: string;
  text?: string;
  splitData?: SplitCompareData;
  timelineData?: TimelineData;
  imageData?: ImageData;
  statData?: StatCardData;
  slideData?: SlideCardData;
  at: number;
}

/**
 * チャプター（domain の Chapter + レガシー visuals 配列の拡張）。
 * 新形式では ScriptLine.visual を使うが、yaml-to-json 変換や fetch-images
 * 等が生成する chapter.visuals 配列との後方互換のためこちらを経由する。
 */
export type Chapter = DomainChapter & {
  /**
   * @deprecated チャプターレベルの legacy visuals 配列。
   * 新形式では ScriptLine.visual を使う。
   */
  visuals?: VisualLegacy[];
};

/** ScriptInput: domain の型に legacy chapter.visuals を許可する拡張を差し込む */
export type ScriptInput = Omit<DomainScriptInput, 'chapters'> & {
  chapters: Chapter[];
};

/** チャートコンポーネントの型定義 */
export interface ChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  title: string;
  animationStyle: 'draw' | 'grow' | 'fade-in' | 'count-up';
  /** ナレーションに合わせて特定データを強調するインデックス */
  highlightIndex?: number;
}
