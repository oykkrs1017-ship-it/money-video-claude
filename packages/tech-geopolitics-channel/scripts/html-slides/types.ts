/**
 * html-slides/types.ts
 * スライド生成で使用する全型定義。
 */

export interface StatVisual    { type:'stat';   value:string; label:string; unit?:string; description?:string; trend?:number; }
export interface ChartVisual   { type:'chart';  key:string; insight?:string; annotations?:Array<{x:string;text:string;position?:'top'|'bottom';color?:string}>; leadText?:string; }
export interface RichPanel     { type:'rich-panel'; title:string; points:Array<string|{title:string;detail:string;badge?:string}>; body?:string; }
export interface TimelineVis   { type:'timeline'; events:Array<{year:string;label:string;highlight?:boolean}>; }
export interface CompTableVis  { type:'comparison-table'; title?:string; columns:Array<string|{label:string;winner?:boolean}>; rows:Array<{label:string;values:string[]}>; }
export interface FlowChart     { type:'flow-chart'; title?:string; root?:{label:string;children?:Array<{label:string;sublabel?:string}>}; steps?:Array<{title:string;description?:string}>; }
export interface ImageVisual   { type:'image'; caption?:string; }
export interface StrategyVisual { type:'strategy-full'; title:string; goal?:string; environment?:string[]; initiatives:Array<{title:string;body?:string}>; kpi?:Array<{value:string;label:string;unit?:string}>; }
export interface KpiContextVisual { type:'kpi-context'; title:string; kpiItems:Array<{value:string;label:string;unit?:string;color?:string}>; bullets?:string[]; context?:string; }

/** コンサル資料レベルの複合レイアウト: KPI比較 + 施策リスト + 環境 + 財務バー */
export interface SegmentStrategyVisual {
  type: 'segment-strategy';
  title: string;
  actionTitle?: string;
  sectionLabel?: string;
  tagline?: string;
  kpiCompare: Array<{label:string; current:string; target:string; diff?:string; highlight?:boolean}>;
  initiatives: Array<{title:string; detail?:string; highlight?:boolean; badge?:string}>;
  environment?: string[];
  financialBar?: Array<{year:string; revenue:string; ebitda:string}>;
}

/** ピラミッド / じょうろ図 — 階層・規模の上下関係 (direction:'up'=ピラミッド, 'down'=じょうろ) */
export interface PyramidVisual {
  type: 'pyramid';
  title: string;
  direction?: 'up' | 'down';
  layers: Array<{ label: string; sublabel?: string; value?: string }>;
  footer?: string;
}

/** ベン図 — 要素の重なり・包含 (2〜3セット, 透明度で重複表現) */
export interface VennVisual {
  type: 'venn';
  title: string;
  sets: Array<{ label: string; items?: string[]; color?: string }>;
  overlapLabel?: string;
  footer?: string;
}

/** 地図 / 拠点 — 地理・物流要衝の可視化 (x,y は 0〜100 のパーセント座標) */
export interface MapVisual {
  type: 'map';
  title: string;
  region: 'asia' | 'world' | 'japan';
  points: Array<{ label: string; x: number; y: number; highlight?: boolean; note?: string }>;
  routes?: Array<{ from: number; to: number; label?: string }>;
  footer?: string;
}

/** 多列データテーブル — 競合スタイルの比較表。maxRowsPerSlide を超えると自動分割 */
export interface DataTableVisual {
  type: 'data-table';
  title: string;
  subtitle?: string;
  labelHeader?: string;
  columns: Array<string | { label: string; color?: string; highlight?: boolean }>;
  rows: Array<{
    label: string;
    labelColor?: string;
    cells: Array<string | { value: string; color?: string; bold?: boolean }>;
  }>;
  maxRowsPerSlide?: number;
  note?: string;
}

/** カラーヘッダーカード — YouTube向け比較カード (2〜3列) */
export interface ColorCardsVisual {
  type: 'color-cards';
  title?: string;
  cards: Array<{
    header: string;
    headerColor?: string;
    icon?: string;
    lines?: string[];
    highlight?: string;
    highlightColor?: string;
  }>;
  footer?: string;
}

/** アイコン付きステップフロー — YouTube向け水平ステップ */
export interface StepIconsVisual {
  type: 'step-icons';
  title?: string;
  steps: Array<{
    number?: number;
    label: string;
    icon?: string;
    body?: string;
    color?: string;
  }>;
  footer?: string;
}

/** VS比較バトル — 左右カード + 中央VSバッジ */
export interface VsBattleVisual {
  type: 'vs-battle';
  title?: string;
  left: {
    header: string;
    headerColor?: string;
    lines?: string[];
    highlight?: string;
    highlightColor?: string;
  };
  right: {
    header: string;
    headerColor?: string;
    lines?: string[];
    highlight?: string;
    highlightColor?: string;
  };
  footer?: string;
}

/** ★ 中央数値強調型 — ドーナツグラフ中央に主要指標を大きく配置 */
export interface DonutCenterVisual {
  type: 'donut-center';
  title?: string;
  centerValue?: string;
  centerLabel?: string;
  insight?: string;
  data: Array<{ label: string; value: number; color?: string; }>;
}

/** ★ 差分強調型 — 棒グラフ上にYoY/CAGR差分アノテーションを重ねる */
export interface BarDiffVisual {
  type: 'bar-diff';
  title?: string;
  insight?: string;
  cagrLabel?: string;
  diff?: {
    from: string;
    to: string;
    label: string;
    color?: string;
  };
  data: Array<{ label: string; value: number; color?: string; }>;
}

/** ★ 推奨ハイライト型① — 2×2 ポジショニングマトリクス (散布図) */
export interface FeatureMatrixVisual {
  type: 'feature-matrix';
  title?: string;
  xLabel?: string;
  yLabel?: string;
  items: Array<{
    label: string;
    x: number;
    y: number;
    highlight?: boolean;
    note?: string;
    color?: string;
  }>;
  quadrantLabels?: [string, string, string, string];
  footer?: string;
}

/** ★ 推奨ハイライト型② — 特徴チェックリスト (推奨列を強調) */
export interface HighlightChecklistVisual {
  type: 'highlight-checklist';
  title?: string;
  columns: Array<{
    label: string;
    recommended?: boolean;
    badge?: string;
    badgeColor?: string;
  }>;
  rows: Array<{
    label: string;
    values: string[];
  }>;
  note?: string;
}

/** ★ 推奨ハイライト型③ — ランキングカード (横並び + 推奨強調) */
export interface RankedCardsVisual {
  type: 'ranked-cards';
  title?: string;
  cards: Array<{
    rank?: number;
    label: string;
    badge?: string;
    badgeColor?: string;
    highlight?: boolean;
    points: string[];
    color?: string;
  }>;
  footer?: string;
}

/** ★ 積み上げ棒グラフ型 — セグメント推移 (特定セグメントを強調) */
export interface StackedShareVisual {
  type: 'stacked-share';
  title?: string;
  insight?: string;
  highlightSegment?: string;
  xLabels: string[];
  segments: Array<{ label: string; color?: string; values: number[]; }>;
  unit?: string;
  note?: string;
}

export type Visual =
  | StatVisual | ChartVisual | RichPanel | TimelineVis | CompTableVis | FlowChart
  | ImageVisual | StrategyVisual | KpiContextVisual | SegmentStrategyVisual
  | PyramidVisual | VennVisual | MapVisual | DataTableVisual
  | ColorCardsVisual | StepIconsVisual | VsBattleVisual
  | DonutCenterVisual | BarDiffVisual | FeatureMatrixVisual
  | HighlightChecklistVisual | RankedCardsVisual | StackedShareVisual;

export interface ScriptLine { speaker: string; text: string; visual?: Visual; }
export interface Chapter    { type: string; topic?: string; lines: ScriptLine[]; skipSection?: boolean; }
export interface ChartEntry { data: Array<{label:string;value:number}>; title?: string; chartType?: string; }
export interface ScriptInput { videoId: string; title: string; description?: string; chapters: Chapter[]; chartData?: Record<string, ChartEntry>; }
export interface SlideDef   { title: string; section: string; layout: string; data: Record<string, unknown>; chartData?: ChartEntry; }

/** renderPane / buildCombinedSlide で使用する中間ペイン表現 */
export interface PaneSpec {
  kind:   'stat' | 'rich' | 'chart' | 'image';
  title?: string;
  // stat
  value?:       string;
  unit?:        string;
  label?:       string;
  description?: string;
  trend?:       number;
  // rich
  points?:      Array<string | { text?: string; value?: string; unit?: string; body?: string; badge?: string }>;
  // chart
  chartData?:   ChartEntry;
  insight?:     string;
  // image
  src?:         string;
  caption?:     string;
}
