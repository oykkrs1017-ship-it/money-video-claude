/**
 * このファイルは schemas/episodeSchema.ts の z.infer 型を re-export します。
 * 型の実体は episodeSchema.ts が source of truth です。
 * 直接このファイルに型を追加しないでください。
 */
export type {
  Episode,
  Section,
  DialogueLine,
  VisualElement,
  CompositionType,
  EpisodeMetadata,
  TelopVisual,
  GraphVisual,
  ImageVisual,
  DataCardVisual,
  QuizChoiceVisual,
  RankingItemVisual,
  RichPanelVisual,
  StatVisual,
  MultiStatVisual,
  VersusCardVisual,
  StepFlowVisual,
  TimelineVisual,
  FlowChartVisual,
  InfographicVisual,
} from '../schemas/episodeSchema';

// 既存コードとの互換性のため個別型も re-export
export type EmotionType = 'neutral' | 'excited' | 'calm' | 'serious' | 'playful';
export type VisualType =
  | 'telop'
  | 'graph'
  | 'image'
  | 'data-card'
  | 'quiz-choice'
  | 'ranking-item'
  | 'rich-panel'
  | 'stat'
  | 'multi-stat'
  | 'versus-card'
  | 'step-flow'
  | 'timeline'
  | 'flow-chart'
  | 'infographic';
export type PositionType = 'center' | 'top' | 'bottom' | 'left' | 'right';
export type AnimationType =
  | 'fade-in'
  | 'slide-up'
  | 'slide-left'
  | 'bounce'
  | 'typewriter'
  | 'scale-up';
export type GraphType = 'bar' | 'line' | 'pie' | 'comparison';

export interface GraphDataPoint {
  label: string;
  value: number;
  color?: string;
  unit?: string;
}

/** 後方互換用（旧コード参照が残っている場合のため）。新規コードでは VisualElement を使用 */
export interface SfxEntry {
  timing: 'start' | 'end' | number;
  file: string;
}
