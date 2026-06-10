/**
 * preview-slides.ts
 *
 * generate-slide-structure.ts が出力した slides.json を
 * generate-html-slides.ts が読める script-input.json 形式に変換し、
 * HTML スライドプレビュー（PNG）を生成する。
 *
 * スライド先行ワークフロー Step 2:
 *   1. generate-slide-structure.ts --with-exa --ep epXXX  → input/epXXX-slides.json
 *   2. preview-slides.ts --ep epXXX                       → out/html-slides/png/*.png
 *   3. ユーザーがスライドを確認・承認
 *   4. generate-script.ts --from-slides --html-slides --ep epXXX  → input/epXXX.yaml
 *   5. 以降は通常フロー（yaml-to-json → 音声 → html:generate → render）
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/preview-slides.ts --ep ep020
 *   npx ts-node --transpile-only scripts/preview-slides.ts --input input/ep020-slides.json
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';

// ─── 型定義（generate-slide-structure.ts の出力形式） ────────────────────────

interface SlideNumber {
  label: string;
  value: string;
  unit?: string;
}

interface SlideChartEntry {
  label: string;
  value: number;
  color?: string;
}

interface SlideEntry {
  index: number;
  role: 'hook' | 'explanation' | 'analysis' | 'summary' | 'cta' | string;
  title: string;
  subTitle?: string;
  keyFacts?: string[];
  numbers?: SlideNumber[];
  chartType?: 'bar' | 'line' | 'pie' | 'none' | string;
  chartData?: SlideChartEntry[];
  speakerHint?: string;
  maroHint?: string;
  designHint?: string;
  /** 直接 visual を指定する場合（color-cards / step-icons / vs-battle 等）*/
  visual?: Record<string, unknown>;
  /** グラフスライドで見出し下に表示するリード文 */
  leadText?: string;
}

interface SlidesJson {
  ep: string;
  topic: string;
  title: string;
  generatedAt?: string;
  slides: SlideEntry[];
}

// ─── generate-html-slides.ts が読む形式 ──────────────────────────────────────

interface ChartEntry {
  title?: string;
  chartType?: string;
  data: Array<{ label: string; value: number }>;
}

type Visual =
  | { type: 'chart'; key: string; insight?: string }
  | { type: 'stat'; value: string; label: string; unit?: string; description?: string }
  | { type: 'rich-panel'; title: string; points: string[]; body?: string };

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

interface ScriptInput {
  videoId: string;
  title: string;
  description?: string;
  chapters: Chapter[];
  chartData?: Record<string, ChartEntry>;
}

// ─── 変換ロジック ─────────────────────────────────────────────────────────────

function chartKey(index: number): string {
  return `slide_${String(index).padStart(3, '0')}_chart`;
}

function slideToVisual(slide: SlideEntry): Visual | undefined {
  // visual フィールドが直接指定されている場合はそのまま使う
  // leadText が slide にある場合はカスタム visual に merge して渡す（leadText が def.data に到達するように）
  if (slide.visual) {
    const v = slide.visual as Record<string, unknown>;
    if (slide.leadText) {
      return { ...v, leadText: slide.leadText } as unknown as Visual;
    }
    return slide.visual as unknown as Visual;
  }

  const hasChart =
    slide.chartType &&
    slide.chartType !== 'none' &&
    slide.chartData &&
    slide.chartData.length > 0;

  if (hasChart) {
    return { type: 'chart', key: chartKey(slide.index), ...(slide.leadText ? { leadText: slide.leadText } : {}) };
  }

  if (slide.numbers && slide.numbers.length > 0) {
    const n = slide.numbers[0];
    return {
      type: 'stat',
      value: n.value,
      label: n.label,
      unit: n.unit,
      description: slide.numbers.slice(1).map((x) => `${x.label}: ${x.value}${x.unit ? ' ' + x.unit : ''}`).join(' / ') || undefined,
    };
  }

  if (slide.keyFacts && slide.keyFacts.length > 0) {
    return {
      type: 'rich-panel',
      title: slide.title,
      points: slide.keyFacts,
    };
  }

  return undefined;
}

function slidesToScriptInput(json: SlidesJson): { input: ScriptInput; chartData: Record<string, ChartEntry> } {
  const chartData: Record<string, ChartEntry> = {};

  // chartData の収集
  for (const slide of json.slides) {
    if (
      slide.chartType &&
      slide.chartType !== 'none' &&
      slide.chartData &&
      slide.chartData.length > 0
    ) {
      chartData[chartKey(slide.index)] = {
        title: slide.title,
        chartType: slide.chartType,
        data: slide.chartData.map((d) => ({ label: d.label, value: d.value })),
      };
    }
  }

  // role → chapter type のグループ化（順序を保持）
  const roleOrder = ['hook', 'explanation', 'analysis', 'summary', 'cta'];
  const chapterMap = new Map<string, SlideEntry[]>();

  for (const slide of json.slides) {
    const role = slide.role;
    if (!chapterMap.has(role)) chapterMap.set(role, []);
    chapterMap.get(role)!.push(slide);
  }

  // roleOrder の順でチャプターを構成（不明な role は末尾に追加）
  const orderedRoles = [
    ...roleOrder.filter((r) => chapterMap.has(r)),
    ...[...chapterMap.keys()].filter((r) => !roleOrder.includes(r)),
  ];

  const chapters: Chapter[] = orderedRoles.map((role) => {
    const slides = chapterMap.get(role)!;
    const lines: ScriptLine[] = [];

    for (const slide of slides) {
      const visual = slideToVisual(slide);

      // ぽんちゃん行（speakerHint → text）
      const ponText = slide.speakerHint ?? slide.title;
      lines.push({
        speaker: 'ponchan',
        text: ponText,
        ...(visual ? { visual } : {}),
      });

      // まろくん行（maroHint がある場合のみ）
      if (slide.maroHint) {
        lines.push({
          speaker: 'maro',
          text: slide.maroHint,
        });
      }
    }

    return {
      type: role,
      topic: slides[0].title,
      lines,
    };
  });

  const input: ScriptInput = {
    videoId: json.ep,
    title: json.title,
    description: json.topic,
    chapters,
    ...(Object.keys(chartData).length > 0 ? { chartData } : {}),
  };

  return { input, chartData };
}

// ─── エントリーポイント ───────────────────────────────────────────────────────

function parseArgs(argv: string[]): { inputPath: string; epId: string } {
  const get = (flag: string): string | undefined => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
  };

  const epId = get('--ep');
  const inputArg = get('--input');

  const packageRoot = path.resolve(__dirname, '..');

  if (inputArg) {
    const abs = path.isAbsolute(inputArg) ? inputArg : path.join(packageRoot, inputArg);
    const derived = path.basename(abs, '-slides.json');
    return { inputPath: abs, epId: epId ?? derived };
  }

  if (epId) {
    return {
      inputPath: path.join(packageRoot, 'input', `${epId}-slides.json`),
      epId,
    };
  }

  console.error(
    '使い方: npx ts-node --transpile-only scripts/preview-slides.ts --ep ep020\n' +
    '        npx ts-node --transpile-only scripts/preview-slides.ts --input input/ep020-slides.json',
  );
  process.exit(1);
}

async function main(): Promise<void> {
  const { inputPath, epId } = parseArgs(process.argv.slice(2));
  const packageRoot = path.resolve(__dirname, '..');

  if (!fs.existsSync(inputPath)) {
    console.error(`❌ slides.json が見つかりません: ${inputPath}`);
    console.error(`先に generate-slide-structure.ts --with-exa --ep ${epId} を実行してください`);
    process.exit(1);
  }

  const json = JSON.parse(fs.readFileSync(inputPath, 'utf-8')) as SlidesJson;
  const slideCount = json.slides?.length ?? 0;
  console.log(`[preview-slides] "${json.title}" (${slideCount}枚) を変換中...`);

  const { input } = slidesToScriptInput(json);

  const previewInputPath = path.join(packageRoot, 'input', `${epId}-preview-input.json`);
  fs.writeFileSync(previewInputPath, JSON.stringify(input, null, 2), 'utf-8');
  console.log(`[preview-slides] preview-input.json を生成: ${previewInputPath}`);

  // generate-html-slides.ts を呼び出す（spawnSync でシェルインジェクション回避）
  const htmlScript = path.join(__dirname, 'generate-html-slides.ts');
  // Windows では .bin/ts-node.cmd、Unix では .bin/ts-node
  const isWin = process.platform === 'win32';
  const tsNodeBin = path.join(
    packageRoot,
    'node_modules',
    '.bin',
    isWin ? 'ts-node.cmd' : 'ts-node',
  );
  const spawnArgs = ['--transpile-only', htmlScript, '--input', previewInputPath, '--no-png'];

  console.log(`[preview-slides] HTML スライド生成中...`);
  console.log(`  > ts-node --transpile-only ${path.basename(htmlScript)} --input <preview-input>`);

  const result = spawnSync(tsNodeBin, spawnArgs, {
    cwd: packageRoot,
    stdio: 'inherit',
    // Windows の .cmd ファイルはシェル経由で実行が必要
    shell: isWin,
  });
  if (result.status !== 0) {
    console.error('❌ HTML スライド生成に失敗しました');
    process.exit(result.status ?? 1);
  }

  // slide-map.json からHTMLスライド数を取得（PNGカウントは--no-pngのため不正確）
  const slideMapPath = path.join(packageRoot, 'out', 'html-slides', 'slide-map.json');
  const htmlSlideCount = fs.existsSync(slideMapPath)
    ? (JSON.parse(fs.readFileSync(slideMapPath, 'utf-8')) as unknown[]).length
    : 0;

  console.log(`
✅ スライドプレビュー生成完了

   スライド数: ${htmlSlideCount} 枚（HTMLスライド）
   一覧: out/html-slides/index.html

📋 次のステップ:
1. out/html-slides/index.html をブラウザで開いてスライドを確認
2. 修正が必要な場合は input/${epId}-slides.json を編集して再実行
3. スライドが承認できたら台本生成:
   npx ts-node --transpile-only scripts/generate-script.ts \\
     --from-slides input/${epId}-slides.json \\
     --html-slides \\
     --topic "${json.topic}" \\
     --ep ${epId}
`);
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error('preview-slides: fatal:', msg);
  process.exit(1);
});
