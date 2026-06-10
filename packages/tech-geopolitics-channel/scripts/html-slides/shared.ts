/**
 * html-slides/shared.ts
 * 全レンダラーが必要とする値・型の一括 re-export。
 * 各レンダラーは `import { C, escHtml, ... } from '../shared'` のみ記述すればよい。
 */

export { C, SLIDE_W, SLIDE_H, FONT, SPACING, SEMANTIC } from './context';
export { escHtml, pointText, clampToPalette, resolveColor, fmtTrend, fmtJP, fmtPct, renderBadge, baseHtml } from './utils';
export type {
  SlideDef, ChartEntry, PaneSpec, Visual,
  StatVisual, ChartVisual, RichPanel, TimelineVis, CompTableVis, FlowChart,
  ImageVisual, StrategyVisual, KpiContextVisual, SegmentStrategyVisual,
  PyramidVisual, VennVisual, MapVisual, DataTableVisual,
  ColorCardsVisual, StepIconsVisual, VsBattleVisual,
  DonutCenterVisual, BarDiffVisual, FeatureMatrixVisual,
  HighlightChecklistVisual, RankedCardsVisual, StackedShareVisual,
  ScriptLine, Chapter, ScriptInput,
} from './types';
