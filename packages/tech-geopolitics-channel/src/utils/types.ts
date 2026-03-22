// script-input.json の型定義

export type SpeakerType = 'maro' | 'ponchan';
export type EmotionType = 'normal' | 'happy' | 'surprised' | 'thinking' | 'serious' | 'sad';
export type ChapterType = 'hook' | 'explanation' | 'analysis' | 'summary' | 'cta';
export type ChartType = 'line' | 'bar' | 'pie' | 'area';
export type VisualType = 'chart' | 'keyword' | 'splitCompare' | 'timeline' | 'split' | 'image' | 'stat';

/** スタットカード（大きな数字を強調表示） */
export interface StatCardData {
  /** メインの数値・テキスト（例: "$500B" "3.7兆円" "200+"） */
  value: string;
  /** ラベル（例: "TSMCの時価総額"） */
  label: string;
  /** 補足説明（例: "2024年時点"） */
  subtext?: string;
  /** 追加の指標リスト */
  metrics?: { key: string; value: string }[];
}

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

/** 静止画ビジュアルのデータ（type='image'の場合） */
export interface ImageData {
  /** public/ からの相対パス（例: "content/map_taiwan.png"） */
  src: string;
  alt?: string;
  /** 画像下部に表示するキャプション */
  caption?: string;
  /**
   * 画面内の配置位置 デフォルト: top-right
   * top-left / top-right / top-center / center-right / center
   */
  position?: 'top-left' | 'top-right' | 'top-center' | 'center-right' | 'center';
  /** 表示幅 (px) デフォルト: 340 */
  width?: number;
  /** 表示秒数 デフォルト: 8 */
  duration?: number;
  /** 登場アニメーション（省略時は position に応じて自動選択） */
  animation?: 'fade' | 'slide-right' | 'slide-left' | 'zoom';
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
  /** 静止画データ（type='image'の場合） */
  imageData?: ImageData;
  /** スタットカードデータ（type='stat'の場合） */
  statData?: StatCardData;
  /** このビジュアルを表示し始める秒数（チャプター先頭からの相対秒） */
  at: number;
}

export interface Chapter {
  type: ChapterType;
  /** このチャプターの目標秒数 */
  duration: number;
  lines: ScriptLine[];
  visuals?: Visual[];
  /**
   * 左上バッジに常時表示するテーマテキスト（テレビ局風）
   * 例: "米中半導体戦争とは" / "日本への影響" / "投資家の視点"
   */
  topic?: string;
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
  /**
   * BGMファイルパス（全編共通・後方互換用）
   * 例: "bgm/main_lofi.mp3"
   * bgmMap が指定されている場合はそちらが優先される
   */
  bgm?: string;
  /** BGM音量 0.0〜1.0 デフォルト: 0.12 */
  bgmVolume?: number;
  /**
   * チャプタータイプ別BGMマップ
   * 指定されたチャプターの再生中のみそのBGMが流れる（クロスフェード付き）
   */
  bgmMap?: {
    hook?: string;
    explanation?: string;
    analysis?: string;
    summary?: string;
    cta?: string;
  };
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
