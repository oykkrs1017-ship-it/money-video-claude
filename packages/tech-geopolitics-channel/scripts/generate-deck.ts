/**
 * generate-deck.ts
 * script-input.json → render-engine.js → PPTX ファイル生成
 *
 * 使い方:
 *   npm run deck:generate [-- --input ./input/script-input.json --out ./out/slides.pptx]
 */

import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { renderDeck } = require('./render-engine');

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface StatVisual {
  type: 'stat';
  value: string;
  label: string;
  unit?: string;
}

interface ChartVisual {
  type: 'chart';
  key: string;
}

interface RichPanelVisual {
  type: 'rich-panel';
  title: string;
  points: string[];
  body?: string;
  number?: number;
  icon?: string;
}

interface TimelineVisual {
  type: 'timeline';
  events: Array<{ year: string; label: string; highlight?: boolean }>;
}

interface ComparisonTableVisual {
  type: 'comparison-table';
  columns: string[];
  rows: Array<{ label: string; values: string[] }>;
}

interface FlowChartVisual {
  type: 'flow-chart';
  title?: string;
  steps?: Array<{ title: string; description?: string }>;
  root?: {
    label: string;
    sublabel?: string;
    children?: Array<{ label: string; sublabel?: string }>;
  };
}

interface ImageVisual {
  type: 'image';
  src?: string;
  caption?: string;
}

type Visual =
  | StatVisual | ChartVisual | RichPanelVisual | TimelineVisual
  | ComparisonTableVisual | FlowChartVisual | ImageVisual;

interface ScriptLine {
  speaker: string;
  text: string;
  visual?: Visual;
}

interface Chapter {
  type: string;
  topic?: string;
  lines: ScriptLine[];
}

interface ChartDataEntry {
  data: Array<{ label: string; value: number }>;
  title?: string;
  chartType?: string;
}

interface ScriptInput {
  videoId: string;
  title: string;
  description?: string;
  tags?: string[];
  chapters: Chapter[];
  chartData?: Record<string, ChartDataEntry>;
}

// ─── ビジュアル → デッキスライド変換 ─────────────────────────────────────────

function chartDataToLayout(chartKey: string, chartData: Record<string, ChartDataEntry>) {
  const cd = chartData[chartKey];
  if (!cd) return null;

  const categories = cd.data.map((d) => d.label);
  const values = cd.data.map((d) => d.value);
  const chartType = (cd.chartType === 'line') ? 'line' : 'col';

  return {
    layout: 'bar-chart-full',
    data: {
      title: cd.title || '',
      chart: {
        type: chartType,
        categories,
        series: [{ name: 'value', values }],
      },
    },
  };
}

function richPanelToLayout(v: RichPanelVisual) {
  const n = (v.points || []).length;
  if (n >= 2 && n <= 6) {
    return {
      layout: 'numbered-feature-cards',
      data: {
        title: v.title,
        cards: v.points.map((p) => ({ title: p })),
      },
    };
  }
  return {
    layout: 'rich-panel-list',
    data: {
      title: v.title,
      items: v.points.map((p) => ({ text: p })),
    },
  };
}

function timelineToLayout(v: TimelineVisual) {
  return {
    layout: 'timeline',
    data: {
      title: 'タイムライン',
      items: v.events.map((e) => ({
        date: e.year,
        label: e.label,
        accent: e.highlight,
      })),
    },
  };
}

function statToLayout(v: StatVisual) {
  return {
    layout: 'text-data-emphasis',
    data: {
      title: v.label,
      stats: [
        {
          value: v.value,
          unit: v.unit || '',
          label: v.label,
          color: '1B3A6B',
        },
      ],
    },
  };
}

function comparisonTableToLayout(v: ComparisonTableVisual) {
  if (v.columns.length <= 2) {
    return {
      layout: 'comparison-table',
      data: {
        title: '',
        columns: v.columns,
        rows: v.rows,
      },
    };
  }
  return {
    layout: 'pricing-table',
    data: {
      title: '',
      columns: v.columns,
      rows: v.rows.map((r) => ({ feature: r.label, values: r.values })),
    },
  };
}

function flowChartToLayout(v: FlowChartVisual) {
  if (v.root) {
    const items = (v.root.children || []).map((c) => ({ label: c.label }));
    return {
      layout: 'radial-spread',
      data: {
        title: v.title || '',
        center: v.root.label,
        items,
      },
    };
  }
  return {
    layout: 'step-flow',
    data: {
      title: v.title || '',
      steps: (v.steps || []).map((s) => ({ title: s.title, description: s.description })),
    },
  };
}

/**
 * ビジュアル定義 → デッキスライド定義へ変換
 * null を返したスライドはスキップ
 */
function visualToSlide(
  visual: Visual,
  section: string,
  chartData: Record<string, ChartDataEntry>
): object | null {
  switch (visual.type) {
    case 'chart': {
      const slide = chartDataToLayout((visual as ChartVisual).key, chartData);
      if (!slide) return null;
      return { section, ...slide };
    }
    case 'rich-panel':
      return { section, ...richPanelToLayout(visual as RichPanelVisual) };
    case 'timeline':
      return { section, ...timelineToLayout(visual as TimelineVisual) };
    case 'stat':
      return { section, ...statToLayout(visual as StatVisual) };
    case 'comparison-table':
      return { section, ...comparisonTableToLayout(visual as ComparisonTableVisual) };
    case 'flow-chart':
      return { section, ...flowChartToLayout(visual as FlowChartVisual) };
    case 'image':
      // 画像は現在のエンジンではスキップ（将来拡張）
      return null;
    default:
      return null;
  }
}

// ─── メイン処理 ───────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const outIdx = args.indexOf('--out');

  const inputPath = inputIdx >= 0
    ? path.resolve(args[inputIdx + 1])
    : path.resolve(__dirname, '../input/script-input.json');

  const outPath = outIdx >= 0
    ? path.resolve(args[outIdx + 1])
    : path.resolve(__dirname, '../out/slides.pptx');

  if (!fs.existsSync(inputPath)) {
    console.error(`[generate-deck] 入力ファイルが見つかりません: ${inputPath}`);
    process.exit(1);
  }

  const script: ScriptInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const chartData = script.chartData || {};

  console.log(`[generate-deck] 入力: ${inputPath}`);
  console.log(`[generate-deck] タイトル: ${script.title}`);
  console.log(`[generate-deck] チャプター数: ${script.chapters.length}`);

  // ─── デッキスライド構築 ───────────────────────────────────────────────────

  const deckSlides: object[] = [];
  const seenVisualKeys = new Set<string>();

  for (const chapter of script.chapters) {
    // CTA チャプターはスキップ
    if (chapter.type === 'cta') continue;

    const sectionLabel = chapter.topic || chapter.type;
    let addedSectionStart = false;

    for (const line of chapter.lines) {
      if (!line.visual) continue;

      // chart は key でデデュープ
      const dedupeKey =
        line.visual.type === 'chart'
          ? `chart:${(line.visual as ChartVisual).key}`
          : line.visual.type === 'stat'
          ? `stat:${(line.visual as StatVisual).value}`
          : null;

      if (dedupeKey) {
        if (seenVisualKeys.has(dedupeKey)) continue;
        seenVisualKeys.add(dedupeKey);
      }

      const slide = visualToSlide(line.visual, sectionLabel, chartData);
      if (!slide) continue;

      // チャプターの最初のスライドにセクション区切りを付与
      if (!addedSectionStart) {
        (slide as { sectionStart?: boolean }).sectionStart = true;
        addedSectionStart = true;
      }

      deckSlides.push(slide);
    }
  }

  if (deckSlides.length === 0) {
    console.warn('[generate-deck] 有効なスライドが0枚です。ビジュアル定義を確認してください。');
    process.exit(1);
  }

  console.log(`[generate-deck] スライド数: ${deckSlides.length} 枚`);

  // ─── デッキ定義 ───────────────────────────────────────────────────────────

  const deck = {
    title: script.title,
    subtitle: script.description || '',
    version: `${script.videoId} | ${new Date().toISOString().slice(0, 10)}`,
    slides: deckSlides,
    ending: {
      title: 'まとめ',
      subtitle: script.title,
    },
  };

  // 出力ディレクトリ作成
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  await renderDeck(deck, outPath);
  console.log(`[generate-deck] 完了: ${outPath}`);
}

main().catch((err) => {
  console.error('[generate-deck] エラー:', err);
  process.exit(1);
});
