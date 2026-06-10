// ============================================================
// comparison/types.ts — 8種比較コンポーネント共通型定義
// ============================================================

export type EvalIcon = '◎' | '○' | '△' | '✕';

// ── 1: カード並列型 ──────────────────────────────────────────
export interface CardItem {
  label: string;
  color: string;
  emoji: string;
  points: string[];
}
export interface CardListProps {
  title?: string;
  subtitle?: string;
  cards?: CardItem[];
  usage?: string;
  startFrame?: number;
}

// ── 2: 比較表型 ──────────────────────────────────────────────
export interface CompTableColumn {
  label: string;
  color?: string;
}
export interface CompTableRow {
  label: string;
  values: EvalIcon[];
}
export interface CompTableProps {
  title?: string;
  columns?: CompTableColumn[];
  rows?: CompTableRow[];
  usage?: string;
  startFrame?: number;
}

// ── 3: レーダーチャート型 ─────────────────────────────────────
export interface RadarAxis {
  label: string;
}
export interface RadarSeries {
  label: string;
  color: string;
  fill: string;
  values: number[]; // 0–5
}
export interface RadarChartProps {
  title?: string;
  axes?: RadarAxis[];
  series?: RadarSeries[];
  maxValue?: number;
  usage?: string;
  startFrame?: number;
}

// ── 4: マトリクス型 ──────────────────────────────────────────
export interface MatrixItem {
  label: string;
  x: number; // -1 (左) ~ +1 (右)
  y: number; // -1 (下) ~ +1 (上)
  color?: string;
  emoji?: string;
}
export interface MatrixProps {
  title?: string;
  xLabel?: { left: string; right: string };
  yLabel?: { top: string; bottom: string };
  items?: MatrixItem[];
  usage?: string;
  startFrame?: number;
}

// ── 5: 長所・短所対比型 ────────────────────────────────────────
export interface ProsConsItem {
  text: string;
}
export interface ProsConsProps {
  title?: string;
  subject?: string;
  pros?: ProsConsItem[];
  cons?: ProsConsItem[];
  usage?: string;
  startFrame?: number;
}

// ── 6: スコアリング型 ─────────────────────────────────────────
export interface ScoringCriterion {
  label: string;
  maxScore: number;
}
export interface ScoringOption {
  label: string;
  color?: string;
  scores: number[];
}
export interface ScoringProps {
  title?: string;
  criteria?: ScoringCriterion[];
  options?: ScoringOption[];
  usage?: string;
  startFrame?: number;
}

// ── 7: 差分強調型 ─────────────────────────────────────────────
export interface DiffRow {
  label: string;
  values: string[];
  isDiff?: boolean;
}
export interface DiffHighlightProps {
  title?: string;
  columns?: string[];
  rows?: DiffRow[];
  diffColor?: string;
  usage?: string;
  startFrame?: number;
}

// ── 8: 推奨ハイライト型 ────────────────────────────────────────
export interface RecommendOption {
  label: string;
  color?: string;
  points: string[];
  isRecommended?: boolean;
  badge?: string;
}
export interface RecommendProps {
  title?: string;
  options?: RecommendOption[];
  usage?: string;
  startFrame?: number;
}
