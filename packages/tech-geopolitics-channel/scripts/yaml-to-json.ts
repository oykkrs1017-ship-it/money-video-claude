/**
 * scripts/yaml-to-json.ts
 * YAMLフォーマットのスクリプトを ScriptInput JSON に変換するツール
 *
 * 使い方:
 *   npx ts-node scripts/yaml-to-json.ts input/script.yaml
 *   npx ts-node scripts/yaml-to-json.ts input/script.yaml -o input/ep002.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { schema } from '@money-video/domain';
import type { InfographicSpec } from '@money-video/domain';

// ---------- 型定義 (src/utils/types.ts から必要なものをインライン) ----------

type SpeakerType = 'maro' | 'ponchan';
type EmotionType = 'normal' | 'happy' | 'surprised' | 'thinking' | 'serious' | 'sad';
type ChapterType = 'hook' | 'explanation' | 'analysis' | 'summary' | 'cta';
type ChartType = 'line' | 'bar' | 'pie' | 'area';
type VisualType = 'chart' | 'keyword' | 'splitCompare' | 'timeline' | 'split' | 'image' | 'stat' | 'slide';
type ImagePosition = 'top-left' | 'top-right' | 'top-center' | 'center-right' | 'center';
type ImageAnimation = 'fade' | 'slide-right' | 'slide-left' | 'zoom';
type SlideLayout = 'bullets' | 'compare' | 'numbers' | 'quote' | 'steps' | 'highlight';

interface SlideCompareColumn {
  label: string;
  color?: string;
  items: string[];
}

interface SlideNumber {
  value: string;
  label: string;
  subtext?: string;
}

interface CompareItemData {
  label: string;
  value?: string;
  subtext?: string;
  color?: string;
  items?: string[];
}

interface TimelineEventData {
  year: string;
  label: string;
  description?: string;
  highlight?: boolean;
  color?: string;
}

/** 新形式: 行単位ビジュアル discriminated union */
type Visual =
  | { type: 'chart'; key: string; chartType?: ChartType; title?: string }
  | { type: 'image'; src?: string; url?: string; caption?: string; position?: ImagePosition; width?: number; duration?: number; animation?: ImageAnimation }
  | { type: 'slide'; layout?: SlideLayout; title?: string; bullets?: string[]; highlight?: string; subtext?: string; quote?: string; attribution?: string; numbers?: SlideNumber[]; left?: SlideCompareColumn; right?: SlideCompareColumn; color?: string }
  | { type: 'stat'; value: string; label: string; subtext?: string; metrics?: { key: string; value: string }[] }
  | { type: 'highlight'; text: string }
  | { type: 'keyword'; text: string }
  | { type: 'timeline'; events: TimelineEventData[]; title?: string; activeIndex?: number; scrollSpeed?: number }
  | { type: 'split'; left: CompareItemData; right: CompareItemData; title?: string }
  | { type: 'rich-panel'; number?: number; title: string; icon?: string; body?: string; emphasis?: string; points?: string[]; color?: string };

/** 旧形式: チャプターレベルのビジュアル（後方互換） */
interface VisualLegacy {
  type: VisualType;
  chartType?: ChartType;
  data?: string;
  text?: string;
  imageData?: {
    src: string;
    url?: string;
    alt?: string;
    caption?: string;
    position?: ImagePosition;
    width?: number;
    duration?: number;
    animation?: ImageAnimation;
  };
  statData?: { value: string; label: string; subtext?: string; metrics?: { key: string; value: string }[] };
  slideData?: {
    layout?: string;
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
  };
  timelineData?: { events: TimelineEventData[]; title?: string; activeIndex?: number; scrollSpeed?: number };
  at: number;
}

interface ScriptLine {
  speaker: SpeakerType;
  text: string;
  emotion: EmotionType;
  audioFile?: string;
  audioDuration?: number;
  frameCount?: number;
  visual?: Visual;
}

interface Chapter {
  type: ChapterType;
  duration: number;
  lines: ScriptLine[];
  /** @deprecated 後方互換のため残存。新形式では ScriptLine.visual を使用 */
  visuals?: VisualLegacy[];
  topic?: string;
}

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface ChartDataSet {
  title?: string;
  chartType?: ChartType;
  data: ChartDataPoint[];
}

interface ScriptInput {
  videoId: string;
  seed: string;
  title: string;
  description: string;
  tags: string[];
  chapters: Chapter[];
  chartData: Record<string, ChartDataSet | ChartDataPoint[]>;
  bgm?: string;
  bgmVolume?: number;
  bgmMap?: {
    hook?: string;
    explanation?: string;
    analysis?: string;
    summary?: string;
    cta?: string;
  };
  infographics?: InfographicSpec[];
}

// ---------- YAMLの入力型定義 ----------

/**
 * 新形式の show: フィールド（discriminated union 直接指定）
 * 例: show: { type: "chart", key: "oil-dependency", chartType: "pie" }
 */
type YamlShowNew = {
  type: string;
  [key: string]: unknown;
};

/**
 * 旧形式の show: フィールド（配列・キー別指定）
 * 例: show: [ { keyword: "テキスト" }, { chart: { data: "key", type: "bar" } } ]
 */
type YamlShowOldEntry =
  | { keyword: string }
  | { stat: { value: string; label: string; subtext?: string; metrics?: { key: string; value: string }[] } }
  | { slide: Record<string, unknown> }
  | { image: Record<string, unknown> }
  | { chart: { data: string; type?: ChartType } }
  | { timeline: { events: TimelineEventData[]; title?: string; activeIndex?: number; scrollSpeed?: number } }
  | { highlight: string }
  | { keyword_float: string };

interface YamlLine {
  maro?: string;
  ponchan?: string;
  emotion?: EmotionType;
  /** 新形式: オブジェクト直接指定 { type: "chart", key: "..." } */
  show?: YamlShowNew | YamlShowOldEntry[];
}

interface YamlChapter {
  type: ChapterType;
  topic?: string;
  duration?: number;
  lines: YamlLine[];
  /** 旧形式の後方互換: チャプターレベルの visuals 配列 */
  visuals?: VisualLegacy[];
}

interface YamlChartDataSetRaw {
  title?: string;
  /** YAML では type: フィールドで chartType を指定できる */
  type?: ChartType;
  chartType?: ChartType;
  data: ChartDataPoint[];
}

interface YamlScript {
  videoId: string;
  seed?: string;
  title: string;
  description?: string;
  tags?: string[];
  bgm?: string;
  bgmVolume?: number;
  bgmMap?: {
    hook?: string;
    explanation?: string;
    analysis?: string;
    summary?: string;
    cta?: string;
  };
  /**
   * 新形式: Record<string, ChartDataSet>
   * 旧形式: Record<string, ChartDataPoint[]>
   * 両方サポート
   */
  chartData?: Record<string, ChartDataPoint[] | YamlChartDataSetRaw>;
  chapters: YamlChapter[];
  infographics?: InfographicSpec[];
}

// ---------- 変換ロジック ----------

/**
 * YamlLine を ScriptLine に変換する
 */
function convertLine(yamlLine: YamlLine): ScriptLine {
  let speaker: SpeakerType;
  let text: string;

  if (yamlLine.maro !== undefined) {
    speaker = 'maro';
    text = String(yamlLine.maro);
  } else if (yamlLine.ponchan !== undefined) {
    speaker = 'ponchan';
    text = String(yamlLine.ponchan);
  } else {
    throw new Error(`各セリフには "maro" または "ponchan" キーが必要です: ${JSON.stringify(yamlLine)}`);
  }

  const line: ScriptLine = {
    speaker,
    text,
    emotion: yamlLine.emotion ?? 'normal',
  };

  if (yamlLine.show !== undefined) {
    const visual = convertShow(yamlLine.show);
    if (visual !== null) {
      line.visual = visual;
    }
  }

  return line;
}

/**
 * show: フィールドを Visual に変換する
 * 新形式 (オブジェクト直接) と旧形式 (配列) の両方に対応
 * 旧形式の配列の場合は最初のエントリのみを変換（複数ビジュアルは非サポート→最初を使用）
 */
function convertShow(show: YamlShowNew | YamlShowOldEntry[]): Visual | null {
  // 新形式: { type: "chart", key: "...", ... }
  if (!Array.isArray(show) && typeof show === 'object' && 'type' in show) {
    return convertNewShowEntry(show as YamlShowNew);
  }

  // 旧形式: 配列 [ { keyword: "..." }, ... ]
  if (Array.isArray(show) && show.length > 0) {
    return convertOldShowEntry(show[0] as YamlShowOldEntry);
  }

  return null;
}

/**
 * 新形式の show オブジェクト { type: "...", ... } を Visual に変換する
 */
function convertNewShowEntry(entry: YamlShowNew): Visual | null {
  const t = entry.type as string;

  if (t === 'chart') {
    return {
      type: 'chart',
      key: (entry.key as string) ?? (entry.data as string) ?? '',
      chartType: (entry.chartType as ChartType | undefined) ?? (entry.charttype as ChartType | undefined),
      title: entry.title as string | undefined,
    };
  }

  if (t === 'image') {
    return {
      type: 'image',
      src: entry.src as string | undefined,
      url: entry.url as string | undefined,
      caption: entry.caption as string | undefined,
      position: (entry.position as ImagePosition | undefined) ?? 'top-center',
      width: entry.width as number | undefined,
      duration: entry.duration as number | undefined,
      animation: entry.animation as ImageAnimation | undefined,
    };
  }

  if (t === 'slide') {
    return {
      type: 'slide',
      layout: entry.layout as SlideLayout | undefined,
      title: entry.title as string | undefined,
      bullets: entry.bullets as string[] | undefined,
      highlight: entry.highlight as string | undefined,
      subtext: entry.subtext as string | undefined,
      quote: entry.quote as string | undefined,
      attribution: entry.attribution as string | undefined,
      numbers: entry.numbers as SlideNumber[] | undefined,
      left: entry.left as SlideCompareColumn | undefined,
      right: entry.right as SlideCompareColumn | undefined,
      color: entry.color as string | undefined,
    };
  }

  if (t === 'stat') {
    return {
      type: 'stat',
      value: entry.value as string,
      label: entry.label as string,
      subtext: entry.subtext as string | undefined,
      metrics: entry.metrics as { key: string; value: string }[] | undefined,
    };
  }

  if (t === 'highlight') {
    return {
      type: 'highlight',
      text: (entry.text as string) ?? '',
    };
  }

  if (t === 'keyword') {
    return {
      type: 'keyword',
      text: (entry.text as string) ?? '',
    };
  }

  if (t === 'timeline') {
    return {
      type: 'timeline',
      events: (entry.events as TimelineEventData[]) ?? [],
      title: entry.title as string | undefined,
      activeIndex: entry.activeIndex as number | undefined,
      scrollSpeed: entry.scrollSpeed as number | undefined,
    };
  }

  if (t === 'split') {
    return {
      type: 'split',
      left: entry.left as CompareItemData,
      right: entry.right as CompareItemData,
      title: entry.title as string | undefined,
    };
  }

  if (t === 'rich-panel') {
    return {
      type: 'rich-panel',
      title: (entry.title as string) ?? '',
      number: entry.number as number | undefined,
      icon: entry.icon as string | undefined,
      body: entry.body as string | undefined,
      emphasis: entry.emphasis as string | undefined,
      points: entry.points as string[] | undefined,
      color: entry.color as string | undefined,
    };
  }

  if (t === 'graph-catalog') {
    return entry as unknown as Visual;
  }

  if (t === 'z-layout') {
    return entry as unknown as Visual;
  }

  if (t === 'number-context') {
    return entry as unknown as Visual;
  }

  if (t === 'fact-insight') {
    return entry as unknown as Visual;
  }

  if (t === 'audience-table') {
    return entry as unknown as Visual;
  }

  console.warn(`不明な show type: ${t}`);
  return null;
}

/**
 * 旧形式の show 配列エントリ1つを Visual に変換する（後方互換）
 */
function convertOldShowEntry(entry: YamlShowOldEntry): Visual | null {
  if ('keyword' in entry) {
    return { type: 'keyword', text: entry.keyword };
  }
  if ('highlight' in entry) {
    return { type: 'highlight', text: entry.highlight as string };
  }
  if ('stat' in entry) {
    return {
      type: 'stat',
      value: entry.stat.value,
      label: entry.stat.label,
      subtext: entry.stat.subtext,
      metrics: entry.stat.metrics,
    };
  }
  if ('slide' in entry) {
    const s = entry.slide as Record<string, unknown>;
    return {
      type: 'slide',
      layout: s.layout as SlideLayout | undefined,
      title: s.title as string | undefined,
      color: s.color as string | undefined,
      bullets: s.bullets as string[] | undefined,
      left: s.left as SlideCompareColumn | undefined,
      right: s.right as SlideCompareColumn | undefined,
      numbers: s.numbers as SlideNumber[] | undefined,
      quote: s.quote as string | undefined,
      attribution: s.attribution as string | undefined,
      highlight: s.highlight as string | undefined,
      subtext: s.subtext as string | undefined,
    };
  }
  if ('image' in entry) {
    const img = entry.image as Record<string, unknown>;
    return {
      type: 'image',
      src: (img.src as string | undefined) ?? undefined,
      url: img.url as string | undefined,
      caption: img.caption as string | undefined,
      position: (img.position as ImagePosition | undefined) ?? 'top-center',
      width: img.width as number | undefined,
      duration: img.duration as number | undefined,
      animation: img.animation as ImageAnimation | undefined,
    };
  }
  if ('chart' in entry) {
    return {
      type: 'chart',
      key: entry.chart.data,
      chartType: entry.chart.type ?? 'bar',
    };
  }
  if ('timeline' in entry) {
    return {
      type: 'timeline',
      events: entry.timeline.events,
      title: entry.timeline.title,
      activeIndex: entry.timeline.activeIndex,
      scrollSpeed: entry.timeline.scrollSpeed,
    };
  }
  console.warn(`不明な旧形式 show エントリ: ${JSON.stringify(entry)}`);
  return null;
}

/**
 * YamlChapter を Chapter に変換する
 */
function convertChapter(yamlChapter: YamlChapter): Chapter {
  const lines: ScriptLine[] = yamlChapter.lines.map(convertLine);

  const chapter: Chapter = {
    type: yamlChapter.type,
    duration: yamlChapter.duration ?? 30,
    lines,
  };

  // 旧形式の visuals: フィールドを後方互換のためそのまま引き継ぐ
  if (yamlChapter.visuals && yamlChapter.visuals.length > 0) {
    chapter.visuals = yamlChapter.visuals;
  }

  if (yamlChapter.topic) {
    chapter.topic = yamlChapter.topic;
  }

  return chapter;
}

/**
 * chartData の各エントリを正規化する
 * 旧形式: ChartDataPoint[] → そのまま保持（後方互換）
 * 新形式: { title, type, data } → { title, chartType, data }
 */
function normalizeChartData(
  raw: Record<string, ChartDataPoint[] | YamlChartDataSetRaw>
): Record<string, ChartDataSet | ChartDataPoint[]> {
  const result: Record<string, ChartDataSet | ChartDataPoint[]> = {};

  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      // 旧形式: ChartDataPoint[] をそのまま保持
      result[key] = value as ChartDataPoint[];
    } else {
      // 新形式: YAMLの type: フィールドを chartType: にマッピング
      const set = value as YamlChartDataSetRaw;
      const normalized: ChartDataSet = {
        data: set.data,
      };
      if (set.title !== undefined) normalized.title = set.title;
      // YAML では type: または chartType: のどちらでも指定できる
      const ct = set.chartType ?? set.type;
      if (ct !== undefined) normalized.chartType = ct;
      result[key] = normalized;
    }
  }

  return result;
}

/**
 * YamlScript 全体を ScriptInput に変換する
 */
function convertYamlToScriptInput(yaml: YamlScript): ScriptInput {
  const scriptInput: ScriptInput = {
    videoId: yaml.videoId,
    seed: yaml.seed ?? yaml.videoId,
    title: yaml.title,
    description: yaml.description ?? '',
    tags: yaml.tags ?? [],
    chapters: yaml.chapters.map(convertChapter),
    chartData: yaml.chartData ? normalizeChartData(yaml.chartData) : {},
  };

  if (yaml.bgm !== undefined) scriptInput.bgm = yaml.bgm;
  if (yaml.bgmVolume !== undefined) scriptInput.bgmVolume = yaml.bgmVolume;
  if (yaml.bgmMap !== undefined) scriptInput.bgmMap = yaml.bgmMap;
  if (yaml.infographics !== undefined) scriptInput.infographics = yaml.infographics;

  return scriptInput;
}

// ---------- CLI エントリポイント ----------

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
使い方:
  npx ts-node scripts/yaml-to-json.ts <input.yaml> [-o <output.json>]

オプション:
  -o <path>   出力先のJSONファイルパス（省略時は input と同じディレクトリに <videoId>.json として出力）
  -h, --help  このヘルプを表示

例:
  npx ts-node scripts/yaml-to-json.ts input/script.yaml
  npx ts-node scripts/yaml-to-json.ts input/script.yaml -o input/ep002.json
`);
    process.exit(0);
  }

  const inputPath = args[0];

  // -o オプションの解析
  let outputPath: string | null = null;
  const oIndex = args.indexOf('-o');
  if (oIndex !== -1 && args[oIndex + 1]) {
    outputPath = args[oIndex + 1];
  }

  // 入力ファイルの確認
  const resolvedInput = path.resolve(inputPath);
  if (!fs.existsSync(resolvedInput)) {
    console.error(`エラー: 入力ファイルが見つかりません: ${resolvedInput}`);
    process.exit(1);
  }

  // YAML 読み込みと変換
  console.log(`読み込み: ${resolvedInput}`);
  const yamlContent = fs.readFileSync(resolvedInput, 'utf-8');

  let yamlData: YamlScript;
  try {
    yamlData = parseYaml(yamlContent) as YamlScript;
  } catch (e) {
    console.error(`エラー: YAML パース失敗: ${(e as Error).message}`);
    process.exit(1);
  }

  let scriptInput: ScriptInput;
  try {
    scriptInput = convertYamlToScriptInput(yamlData);
  } catch (e) {
    console.error(`エラー: 変換失敗: ${(e as Error).message}`);
    process.exit(1);
  }

  // EpisodeSpec.v1 スキーマで出力を検証（型の整合性を保証する）
  const validation = schema.EpisodeSpecV1Schema.safeParse(scriptInput);
  if (!validation.success) {
    console.error('エラー: 変換後のデータが EpisodeSpec.v1 スキーマに適合しません:');
    for (const issue of validation.error.issues) {
      const loc = issue.path.join(' → ') || '(root)';
      console.error(`  [${loc}] ${issue.message}`);
    }
    process.exit(1);
  }

  // 出力先の決定
  if (!outputPath) {
    const inputDir = path.dirname(resolvedInput);
    outputPath = path.join(inputDir, `${scriptInput.videoId}.json`);
  }

  const resolvedOutput = path.resolve(outputPath);

  // script-input.json への上書き保護
  if (path.basename(resolvedOutput) === 'script-input.json') {
    console.warn(`\n警告: 出力先が script-input.json です。既存ファイルを上書きしますか? (y/N)`);
    const readline = require('readline');
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('> ', (answer: string) => {
      rl.close();
      if (answer.toLowerCase() !== 'y') {
        console.log('中断しました。-o オプションで別の出力先を指定してください。');
        process.exit(0);
      }
      writeOutput(resolvedOutput, scriptInput);
    });
    return;
  }

  writeOutput(resolvedOutput, scriptInput);
}

function writeOutput(outputPath: string, scriptInput: ScriptInput): void {
  const outputJson = JSON.stringify(scriptInput, null, 2);
  fs.writeFileSync(outputPath, outputJson, 'utf-8');
  console.log(`\n変換完了: ${outputPath}`);
  console.log(`  videoId   : ${scriptInput.videoId}`);
  console.log(`  タイトル  : ${scriptInput.title}`);
  console.log(`  チャプター: ${scriptInput.chapters.length}個`);
  console.log(`  総セリフ数: ${scriptInput.chapters.reduce((sum, c) => sum + c.lines.length, 0)}行`);
  const totalLinesWithVisual = scriptInput.chapters.reduce(
    (sum, c) => sum + c.lines.filter((l) => l.visual !== undefined).length,
    0
  );
  const totalLegacyVisuals = scriptInput.chapters.reduce((sum, c) => sum + (c.visuals?.length ?? 0), 0);
  console.log(`  行単位ビジュアル: ${totalLinesWithVisual}行`);
  if (totalLegacyVisuals > 0) {
    console.log(`  旧形式ビジュアル: ${totalLegacyVisuals}個`);
  }
}

main();
