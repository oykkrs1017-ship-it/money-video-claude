/** html-slides/dispatch.ts — renderSlide / visualToSlide / buildCombinedSlide / visualToPane */

import type {
  Visual, SlideDef, PaneSpec, ChartEntry,
  StatVisual, ChartVisual, RichPanel, TimelineVis, CompTableVis, FlowChart,
  PyramidVisual, VennVisual, MapVisual, DataTableVisual, StrategyVisual,
  KpiContextVisual, SegmentStrategyVisual,
  ColorCardsVisual, StepIconsVisual, VsBattleVisual,
  DonutCenterVisual, BarDiffVisual, FeatureMatrixVisual,
  HighlightChecklistVisual, RankedCardsVisual, StackedShareVisual,
} from './types';

import { renderCover, renderSection, renderToc, renderStat } from './renderers/basic';
import { renderChart, renderChartInsight } from './renderers/chart';
import { renderRichPanel, renderTimeline, renderTable } from './renderers/content';
import { renderDataTable, renderRadial, renderStepFlow } from './renderers/data';
import {
  renderStackedList, renderCheckGrid, renderKeyMessage, renderBeforeAfter,
  renderKpiBand, renderTwoCol, renderFeatureCards, renderIconMatrix,
} from './renderers/list';
import { renderEraSplit, renderInsightSplit, renderStrategyFull, renderKpiContext, renderSegmentStrategy } from './renderers/strategy';
import { renderDualPanel, renderTriplePanel, renderStatGrid } from './renderers/panels';
import { renderPyramid, renderVenn, renderMap } from './renderers/visual';
import { renderColorCards, renderStepIcons, renderVsBattle, renderDonutCenter, renderBarDiff } from './renderers/interactive';
import { renderFeatureMatrix, renderHighlightChecklist, renderRankedCards, renderStackedShare } from './renderers/cards';

// ─── ディスパッチャー ─────────────────────────────────────────────────────────

export function renderSlide(def: SlideDef): string {
  switch (def.layout) {
    case 'cover':          return renderCover(def);
    case 'toc':            return renderToc(def);
    case 'section':        return renderSection(def);
    case 'stat':           return renderStat(def);
    case 'chart':               return renderChart(def);
    case 'chart-insight-split': return renderChartInsight(def);
    case 'rich-panel':          return renderRichPanel(def);
    case 'timeline':       return renderTimeline(def);
    case 'table':          return renderTable(def);
    case 'data-table':     return renderDataTable(def);
    case 'radial':         return renderRadial(def);
    case 'step-flow':      return renderStepFlow(def);
    // McKinsey バリアント
    case 'stacked-list':   return renderStackedList(def);
    case 'check-grid':     return renderCheckGrid(def);
    case 'key-message':    return renderKeyMessage(def);
    case 'before-after':   return renderBeforeAfter(def);
    case 'icon-matrix':    return renderIconMatrix(def);
    case 'era-split':      return renderEraSplit(def);
    case 'insight-split':  return renderInsightSplit(def);
    // 新プリセット
    case 'kpi-band':       return renderKpiBand(def);
    case 'two-col':        return renderTwoCol(def);
    case 'feature-cards':  return renderFeatureCards(def);
    // 情報集約レイアウト
    case 'strategy-full':     return renderStrategyFull(def);
    case 'kpi-context':       return renderKpiContext(def);
    case 'segment-strategy':  return renderSegmentStrategy(def);
    // 複合レイアウト
    case 'dual-panel':     return renderDualPanel(def);
    case 'triple-panel':   return renderTriplePanel(def);
    case 'stat-grid':      return renderStatGrid(def);
    // 階層 / 重なり / 地理
    case 'pyramid':        return renderPyramid(def);
    case 'venn':           return renderVenn(def);
    case 'map':            return renderMap(def);
    // YouTube向けカラフルカード
    case 'color-cards':    return renderColorCards(def);
    case 'step-icons':     return renderStepIcons(def);
    case 'vs-battle':      return renderVsBattle(def);
    // Slideland研究型
    case 'donut-center':   return renderDonutCenter(def);
    case 'bar-diff':       return renderBarDiff(def);
    // 推奨ハイライト型シリーズ
    case 'feature-matrix':       return renderFeatureMatrix(def);
    case 'highlight-checklist':  return renderHighlightChecklist(def);
    case 'ranked-cards':         return renderRankedCards(def);
    case 'stacked-share':        return renderStackedShare(def);
    default:               return renderStat(def);
  }
}

// ─── script-input.json → SlideDef 変換 ────────────────────────────────────────

export function visualToSlide(visual: Visual, section: string, chartData: Record<string, ChartEntry>): SlideDef | SlideDef[] | null {
  switch (visual.type) {
    case 'stat': {
      const v = visual as StatVisual;
      const description = v.description ?? '';
      return { title: v.label, section, layout: 'stat', data: { stats: [{ value: v.value, label: v.label, unit: v.unit ?? '' }], description, ...(v.trend !== undefined ? { trend: v.trend } : {}) } };
    }
    case 'chart': {
      const v = visual as ChartVisual;
      const cd = chartData[v.key];
      if (!cd) return null;
      const insight = v.insight ?? '';
      const layout = insight ? 'chart-insight-split' : 'chart';
      return { title: cd.title ?? '', section, layout, data: { insight, annotations: v.annotations ?? [], ...(v.leadText ? { leadText: v.leadText } : {}) }, chartData: cd };
    }
    case 'rich-panel': {
      const v = visual as RichPanel;
      return { title: v.title, section, layout: 'rich-panel', data: { points: v.points } };
    }
    case 'timeline': {
      const v = visual as TimelineVis;
      return { title: 'タイムライン', section, layout: 'timeline', data: { events: v.events } };
    }
    case 'comparison-table': {
      const v = visual as CompTableVis;
      const cols = v.columns.map(c => typeof c === 'string' ? c : c.label);
      return { title: v.title ?? '', section, layout: 'table', data: { columns: cols, rows: v.rows } };
    }
    case 'data-table': {
      const v = visual as DataTableVisual;
      const maxRows = v.maxRowsPerSlide ?? 6;
      const cols = v.columns.map(c => typeof c === 'string' ? { label: c } : c);
      const lt = (visual as { leadText?: string }).leadText ?? '';
      const commonData = { columns: cols, labelHeader: v.labelHeader ?? '', subtitle: v.subtitle ?? '', note: v.note ?? '', leadText: lt };
      if (v.rows.length <= maxRows) {
        return { title: v.title, section, layout: 'data-table', data: { ...commonData, rows: v.rows } };
      }
      const roman = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
      const slides: SlideDef[] = [];
      for (let i = 0; i < v.rows.length; i += maxRows) {
        const part = slides.length;
        const suffix = ` ${roman[part] ?? part + 1}`;
        slides.push({ title: `${v.title}${suffix}`, section, layout: 'data-table', data: { ...commonData, rows: v.rows.slice(i, i + maxRows) } });
      }
      return slides;
    }
    case 'flow-chart': {
      const v = visual as FlowChart;
      if (v.root) {
        return { title: v.title ?? '', section, layout: 'radial', data: { center: v.root.label, items: (v.root.children ?? []).map(c => ({ label: c.label })) } };
      }
      return { title: v.title ?? '', section, layout: 'step-flow', data: { steps: v.steps ?? [] } };
    }
    case 'image':
      return null;
    case 'pyramid': {
      const v = visual as PyramidVisual;
      return { title: v.title, section, layout: 'pyramid', data: { direction: v.direction ?? 'up', layers: v.layers, footer: v.footer ?? '' } };
    }
    case 'venn': {
      const v = visual as VennVisual;
      return { title: v.title, section, layout: 'venn', data: { sets: v.sets, overlapLabel: v.overlapLabel ?? '', footer: v.footer ?? '' } };
    }
    case 'map': {
      const v = visual as MapVisual;
      return { title: v.title, section, layout: 'map', data: { region: v.region, points: v.points, routes: v.routes ?? [], footer: v.footer ?? '' } };
    }
    case 'strategy-full': {
      const v = visual as StrategyVisual;
      return { title: v.title, section, layout: 'strategy-full', data: { goal: v.goal ?? '', environment: v.environment ?? [], initiatives: v.initiatives, kpi: v.kpi ?? [] } };
    }
    case 'kpi-context': {
      const v = visual as KpiContextVisual;
      return { title: v.title, section, layout: 'kpi-context', data: { kpiItems: v.kpiItems, bullets: v.bullets ?? [], context: v.context ?? '' } };
    }
    case 'segment-strategy': {
      const v = visual as SegmentStrategyVisual;
      return {
        title: v.title, section, layout: 'segment-strategy',
        data: {
          sectionLabel: v.sectionLabel ?? '',
          tagline:      v.tagline ?? '',
          actionTitle:  (visual as SegmentStrategyVisual).actionTitle ?? '',
          kpiCompare:   v.kpiCompare,
          initiatives:  v.initiatives,
          environment:  v.environment ?? [],
          financialBar: v.financialBar ?? [],
        }
      };
    }
    case 'color-cards': {
      const v = visual as ColorCardsVisual;
      const lt = (visual as { leadText?: string }).leadText ?? '';
      return { title: v.title ?? '', section, layout: 'color-cards', data: { cards: v.cards, footer: v.footer ?? '', leadText: lt } };
    }
    case 'step-icons': {
      const v = visual as StepIconsVisual;
      const lt = (visual as { leadText?: string }).leadText ?? '';
      return { title: v.title ?? '', section, layout: 'step-icons', data: { steps: v.steps, footer: v.footer ?? '', leadText: lt } };
    }
    case 'vs-battle': {
      const v = visual as VsBattleVisual;
      const lt = (visual as { leadText?: string }).leadText ?? '';
      return { title: v.title ?? '', section, layout: 'vs-battle', data: { left: v.left, right: v.right, footer: v.footer ?? '', leadText: lt } };
    }
    case 'donut-center': {
      const v = visual as DonutCenterVisual;
      const lt = (visual as { leadText?: string }).leadText ?? '';
      return {
        title: v.title ?? '', section, layout: 'donut-center',
        data: { data: v.data, centerValue: v.centerValue ?? '', centerLabel: v.centerLabel ?? '', insight: v.insight ?? '', leadText: lt },
      };
    }
    case 'bar-diff': {
      const v = visual as BarDiffVisual;
      const lt = (visual as { leadText?: string }).leadText ?? '';
      return {
        title: v.title ?? '', section, layout: 'bar-diff',
        data: { data: v.data, diff: v.diff, cagrLabel: v.cagrLabel ?? '', insight: v.insight ?? '', leadText: lt },
      };
    }
    case 'feature-matrix': {
      const v = visual as FeatureMatrixVisual;
      const lt = (visual as { leadText?: string }).leadText ?? '';
      return {
        title: v.title ?? '', section, layout: 'feature-matrix',
        data: { items: v.items, xLabel: v.xLabel ?? '', yLabel: v.yLabel ?? '', quadrantLabels: v.quadrantLabels ?? [], footer: v.footer ?? '', leadText: lt },
      };
    }
    case 'highlight-checklist': {
      const v = visual as HighlightChecklistVisual;
      return {
        title: v.title ?? '', section, layout: 'highlight-checklist',
        data: { columns: v.columns, rows: v.rows, note: v.note ?? '' },
      };
    }
    case 'ranked-cards': {
      const v = visual as RankedCardsVisual;
      const lt = (visual as { leadText?: string }).leadText ?? '';
      return {
        title: v.title ?? '', section, layout: 'ranked-cards',
        data: { cards: v.cards, footer: v.footer ?? '', leadText: lt },
      };
    }
    case 'stacked-share': {
      const v = visual as StackedShareVisual;
      return {
        title: v.title ?? '', section, layout: 'stacked-share',
        data: { xLabels: v.xLabels, segments: v.segments, insight: v.insight ?? '', highlightSegment: v.highlightSegment ?? '', unit: v.unit ?? '', note: v.note ?? '' },
      };
    }
    default:
      return null;
  }
}

// ─── 複合スライド構築 ─────────────────────────────────────────────────────────

/** visual → PaneSpec 変換 */
export function visualToPane(v: Visual, chartData: Record<string, ChartEntry>): PaneSpec | null {
  switch (v.type) {
    case 'stat':
      return { kind: 'stat', value: (v as StatVisual).value, unit: (v as StatVisual).unit, label: (v as StatVisual).label, description: (v as StatVisual).description, trend: (v as StatVisual).trend, title: (v as StatVisual).label };
    case 'rich-panel': {
      const rp = v as RichPanel;
      return { kind: 'rich', title: rp.title, points: rp.points as PaneSpec['points'] };
    }
    case 'chart': {
      const cv = v as ChartVisual;
      const cd = chartData[cv.key];
      if (!cd) return null;
      return { kind: 'chart', title: cd.title, chartData: cd, insight: cv.insight };
    }
    case 'image':
      return null;
    default:
      return null;
  }
}

/** combineNext で統合する複合スライド SlideDef を構築 */
export function buildCombinedSlide(
  lines: Array<{ visual?: Visual; speaker?: string }>,
  layout: 'dual-panel' | 'triple-panel' | 'stat-grid',
  mode: string | undefined,
  chartData: Record<string, ChartEntry>,
  section: string,
  combineTitle: string | undefined,
): SlideDef {
  const panes: PaneSpec[] = lines.map(l => visualToPane(l.visual!, chartData)).filter(Boolean) as PaneSpec[];
  const title = combineTitle ?? panes[0]?.title ?? '';

  if (layout === 'stat-grid') {
    const stats = panes.filter(p => p.kind === 'stat').map(p => ({
      value: p.value ?? '', unit: p.unit, label: p.label ?? '', description: p.description, trend: p.trend,
    }));
    return { title, section, layout: 'stat-grid', data: { stats } };
  }

  const cleanedPanes = panes.map(p => ({ ...p, title: undefined }));
  const data: Record<string, unknown> = { panes: cleanedPanes };
  if (layout === 'triple-panel') data.layout = mode === 'top-1-bot-2' ? 'top-1-bot-2' : 'vertical-3';

  return { title, section, layout, data };
}
