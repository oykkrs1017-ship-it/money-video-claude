// script-input.json の型定義

export type SpeakerType = 'zundamon' | 'metan';
export type EmotionType = 'normal' | 'happy' | 'surprised' | 'thinking' | 'serious' | 'sad';
export type ChapterType = 'hook' | 'explanation' | 'analysis' | 'summary' | 'cta';
export type ChartType = 'line' | 'bar' | 'pie' | 'area';
export type VisualType = 'chart' | 'keyword' | 'splitCompare' | 'timeline' | 'split';

export interface ScriptLine {
  speaker: SpeakerType;
  text: string;
  emotion: EmotionType;
  /** VOICEVOXで生成後に自動付与される音声ファイルパス */
  audioFile?: string;
  /** WAVヘッダーから取得した音声長(秒) */
  audioDuration?: number;
  /** フレーム数（audioDuration * fps + 5バッファ） */
  frameCount?: number;
}

export interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

export interface SplitCompareData {
  left: import('../components/SplitCompare').CompareItem;
  right: import('../components/SplitCompare').CompareItem;
  title?: string;
}

export interface TimelineEventData {
  year: string;
  label: string;
  description?: string;
  highlight?: boolean;
  color?: string;
}

export interface TimelineData {
  events: TimelineEventData[];
  title?: string;
  activeIndex?: number;
  scrollSpeed?: number;
}

export interface Visual {
  type: VisualType;
  /** チャートタイプ（type='chart'の場合） */
  chartType?: ChartType;
  /** chartDataのキー名 */
  data?: string;
  /** キーワードテキスト（type='keyword'の場合） */
  text?: string;
  /** 分割比較データ（type='split'の場合） */
  splitData?: SplitCompareData;
  /** タイムラインデータ（type='timeline'の場合） */
  timelineData?: TimelineData;
  /** このビジュアルを表示し始める秒数（チャプター先頭からの相対秒） */
  at: number;
}

export interface Chapter {
  type: ChapterType;
  /** このチャプターの目標秒数 */
  duration: number;
  lines: ScriptLine[];
  visuals?: Visual[];
}

export interface ScriptInput {
  videoId: string;
  /** VariationConfigの決定論的生成に使うシード文字列 */
  seed: string;
  title: string;
  description: string;
  tags: string[];
  chapters: Chapter[];
  chartData: Record<string, ChartDataPoint[]>;
}

// VariationEngine の型定義

export type ThemeType = 'midnight-blue' | 'forest-green' | 'warm-sunset' | 'arctic-white' | 'crimson-dark';
export type TitleStyleType = 'slide-left' | 'fade-scale' | 'typewriter' | 'glitch' | 'split-reveal';
export type CharacterLayoutType = 'left-right' | 'bottom-center' | 'picture-in-picture' | 'alternating';
export type SubtitleStyleType = 'bottom-bar' | 'floating' | 'highlight-word' | 'cinematic';
export type TransitionType = 'fade' | 'slide' | 'zoom' | 'wipe' | 'dissolve';
export type BackgroundType = 'gradient' | 'particles' | 'grid' | 'wave' | 'geometric';

export interface VariationConfig {
  theme: ThemeType;
  titleStyle: TitleStyleType;
  characterLayout: CharacterLayoutType;
  subtitleStyle: SubtitleStyleType;
  transition: TransitionType;
  background: BackgroundType;
}

// チャートコンポーネントの型定義

export interface ChartProps {
  type: ChartType;
  data: ChartDataPoint[];
  title: string;
  animationStyle: 'draw' | 'grow' | 'fade-in' | 'count-up';
  /** ナレーションに合わせて特定データを強調するインデックス */
  highlightIndex?: number;
}
