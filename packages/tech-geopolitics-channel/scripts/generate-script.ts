/**
 * scripts/generate-script.ts  (thin CLI shim)
 *
 * 旧 CLI 互換:
 *   npx ts-node --transpile-only scripts/generate-script.ts \
 *     --topic "トピック名" \
 *     --ep epXXX \
 *     [--desc "補足説明"] \
 *     [--research-file input/epXXX_research.md]
 *
 * ロジック本体は packages/adapters と packages/usecases に移設済み。
 * このファイルは argv パース → DI wiring → ユースケース呼び出しのみ。
 *
 * 環境変数:
 *   ANTHROPIC_API_KEY  ← .env または環境変数に設定
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

import { createLogger } from '@money-video/shared-ts';
import { AnthropicClient } from '@money-video/adapters/llm';
import {
  FileSystemKnowledgeRepo,
  FileSystemInfographicResolver,
  FileSystemScriptYamlWriter,
  FileSystemPastEpisodesResolver,
} from '@money-video/adapters/knowledge';
import { ExaTopicResearcher } from '@money-video/adapters/research';
import { GenerateScriptUseCase } from '@money-video/usecases/generateScript';

interface SlideEntry {
  index: number;
  role: string;
  title: string;
  subTitle?: string;
  keyFacts?: string[];
  numbers?: Array<{ label: string; value: string; unit?: string }>;
  chartType?: string;
  chartData?: Array<{ label: string; value: number; color?: string }>;
  speakerHint?: string;
  maroHint?: string;
}

interface Args {
  topic: string;
  epId: string;
  desc: string;
  researchFile?: string;
  withExa: boolean;
  /** --from-slides: スライド構造 JSON のパス（generate-slide-structure.ts の出力） */
  fromSlides?: string;
  /** --html-slides: from-slides 時に image タイプではなく chart/stat/rich-panel ネイティブタイプを使う */
  htmlSlides: boolean;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string, alt?: string): string | undefined => {
    const i = argv.indexOf(flag);
    if (i >= 0 && argv[i + 1]) return argv[i + 1];
    if (alt) {
      const j = argv.indexOf(alt);
      if (j >= 0 && argv[j + 1]) return argv[j + 1];
    }
    return undefined;
  };

  const topic = get('--topic');
  if (!topic) {
    // eslint-disable-next-line no-console
    console.error(
      '使い方: npx ts-node --transpile-only scripts/generate-script.ts --topic "トピック名" [--ep epXXX] [--desc "補足"] [--research-file input/epXXX_research.md] [--with-exa] [--from-slides input/epXXX-slides.json]',
    );
    process.exit(1);
  }
  return {
    topic,
    epId: get('--ep') ?? 'ep_draft',
    desc: get('--desc') ?? '',
    researchFile: get('--research-file', '-r'),
    withExa: argv.includes('--with-exa'),
    fromSlides: get('--from-slides'),
    htmlSlides: argv.includes('--html-slides'),
  };
}

/**
 * スライド構造 JSON をプロンプト用 Markdown に変換する。
 * generate-script.ts がリサーチコンテキストとして LLM に渡す。
 */
function buildSlidesContext(epId: string, slides: SlideEntry[]): string {
  const lines: string[] = [
    '## スライド構造（このスライドを順番に解説する台本を書くこと）',
    '',
    `スライド画像は public/images/${epId}/slide-XX.jpg として配置される。`,
    '各 line の visual には以下の image タイプを設定すること（animation: fade で静止表示）:',
    '```',
    'show:',
    '  type: image',
    `  src: "images/${epId}/slide-XX.jpg"  # XX はゼロ埋め 2 桁（01, 02...）`,
    '  animation: fade',
    '  width: 1680',
    '```',
    '',
    '1 スライド = 1〜2 セリフを基本とする。speakerHint の内容をベースにセリフを 60 文字以上に膨らませること。',
    '',
    '---',
    '',
  ];

  for (const slide of slides) {
    const imgIndex = String(slide.index).padStart(2, '0');
    lines.push(`### スライド${slide.index} [${slide.role}] — ${slide.title}`);
    lines.push(`画像パス: images/${epId}/slide-${imgIndex}.jpg`);
    if (slide.subTitle) lines.push(`サブタイトル: ${slide.subTitle}`);

    if (slide.keyFacts && slide.keyFacts.length > 0) {
      lines.push('キーファクト:');
      slide.keyFacts.forEach((f) => lines.push(`  - ${f}`));
    }

    if (slide.numbers && slide.numbers.length > 0) {
      lines.push('重要な数値:');
      slide.numbers.forEach((n) => {
        const unit = n.unit ? ` (${n.unit})` : '';
        lines.push(`  - ${n.label}: ${n.value}${unit}`);
      });
    }

    if (slide.speakerHint) lines.push(`ぽんちゃんヒント: ${slide.speakerHint}`);
    if (slide.maroHint) lines.push(`まろくんヒント: ${slide.maroHint}`);

    lines.push('');
  }

  return lines.join('\n');
}

/**
 * HTML スライドモード用コンテキスト。
 * --from-slides --html-slides 時に使う。
 * LLM に chart/stat/rich-panel ネイティブタイプを使わせ、chartData セクションも出力させる。
 */
function buildSlidesContextHtml(epId: string, slides: SlideEntry[]): string {
  const lines: string[] = [
    '## スライド構造（HTMLスライドモード）',
    '',
    '以下のスライド構造に基づき、各スライドを解説するナレーション台本を生成してください。',
    `【セリフ数絶対必須】合計 55〜65 セリフ（ponchan + maro）を生成すること。${slides.length}枚のスライドがあるので、1スライドあたり平均 ${Math.ceil(55 / slides.length)}〜${Math.ceil(65 / slides.length)} セリフを割り当てること。`,
    '【重要】visual には image タイプではなく、以下のネイティブタイプを使うこと:',
    '',
    '| スライドの chartType | show に使うタイプ |',
    '|---|---|',
    '| bar / line / pie | type: chart, key: slide_NNN_chart |',
    '| none + numbers あり | type: stat, value/label/unit を設定 |',
    '| none + numbers なし | type: rich-panel, title/points を設定 |',
    '',
    '【必須】chartData セクションを YAML の最上位に含めること。',
    '各スライドの chartData は以下のキーで参照する（NNN = 3桁ゼロ埋め）:',
    '',
  ];

  // chartData キー一覧を提示
  const chartKeys: string[] = [];
  for (const slide of slides) {
    if (slide.chartType && slide.chartType !== 'none' && slide.chartData && slide.chartData.length > 0) {
      chartKeys.push(`slide_${String(slide.index).padStart(3, '0')}_chart`);
    }
  }
  if (chartKeys.length > 0) {
    lines.push('chartData キー一覧:');
    chartKeys.forEach((k) => lines.push(`  - ${k}`));
    lines.push('');
  }

  lines.push('---', '');

  for (const slide of slides) {
    const idx = String(slide.index).padStart(3, '0');
    const hasChart = slide.chartType && slide.chartType !== 'none' && slide.chartData && slide.chartData.length > 0;

    lines.push(`### スライド${slide.index} [${slide.role}] — ${slide.title}`);
    if (slide.subTitle) lines.push(`サブタイトル: ${slide.subTitle}`);

    if (hasChart) {
      const key = `slide_${idx}_chart`;
      lines.push(`ビジュアル指定: show: { type: chart, key: ${key} }`);
      lines.push(`chartData.${key}:`);
      lines.push(`  title: "${slide.title}"`);
      lines.push(`  chartType: ${slide.chartType}`);
      lines.push('  data:');
      slide.chartData!.forEach((d) => {
        lines.push(`    - { label: "${d.label}", value: ${d.value} }`);
      });
    } else if (slide.numbers && slide.numbers.length > 0) {
      const n = slide.numbers[0];
      lines.push(`ビジュアル指定: show: { type: stat, value: "${n.value}", label: "${n.label}"${n.unit ? `, unit: "${n.unit}"` : ''} }`);
    } else if (slide.keyFacts && slide.keyFacts.length > 0) {
      lines.push(`ビジュアル指定: show: { type: rich-panel, title: "${slide.title}", points: [...] }`);
      lines.push('ポイント:');
      slide.keyFacts.forEach((f) => lines.push(`  - ${f}`));
    }

    if (slide.numbers && slide.numbers.length > 0) {
      lines.push('重要な数値:');
      slide.numbers.forEach((n) => {
        const unit = n.unit ? ` (${n.unit})` : '';
        lines.push(`  - ${n.label}: ${n.value}${unit}`);
      });
    }
    if (slide.keyFacts && slide.keyFacts.length > 0 && !hasChart) {
      lines.push('キーファクト:');
      slide.keyFacts.forEach((f) => lines.push(`  - ${f}`));
    }
    if (slide.speakerHint) lines.push(`ぽんちゃんヒント: ${slide.speakerHint}`);
    if (slide.maroHint) lines.push(`まろくんヒント: ${slide.maroHint}`);
    lines.push('');
  }

  return lines.join('\n');
}

/** HTML スライドモード用の補足説明文 */
function buildSlidesModeDescHtml(slideCount: number): string {
  return (
    `【HTMLスライドモード】${slideCount}枚のスライド構造を元にナレーション台本を生成する。` +
    `【重要】必須ルール上書き: image タイプ禁止。各 show には chart/stat/rich-panel のネイティブタイプを使う。` +
    `出力 YAML の最上位に chartData: セクションを含め、chart タイプの show.key と対応させること。` +
    `speakerHint の内容をベースに 60 文字以上のセリフに膨らませること。` +
    `【セリフ数必須】1スライドあたり ponchan/maro 合わせて 2〜4セリフを割り当て、合計 55〜65セリフになるよう生成すること。` +
    `セリフ数が 55 未満の場合は各スライドのセリフを追加して補うこと。` +
    `【絶対必須・スライド全挿入】${slideCount}枚のスライドがあるため、各チャプター内でスライド数と同数の visual スロット（show:付きponchan行）を必ず生成すること。` +
    `visual スロットが不足すると対応スライドが動画に挿入されない。analysis等の複数スライドを持つチャプターは、スライド1枚につき必ず1行visual付きponchan行を含めること。`
  );
}

/** スライドモード用の補足説明文（desc に付加する） */
function buildSlidesModeDesc(epId: string, slideCount: number): string {
  return (
    `【スライドモード — ビジュアルルール上書き】${slideCount}枚のスライド画像` +
    `（public/images/${epId}/slide-01.jpg〜）を順番に解説する台本を生成する。` +
    `【重要】必須ルール1（rich-panel 60%以上）を上書きする: rich-panelは使わず、` +
    `各lineのvisualには必ず image タイプ（animation: fade）を設定すること。` +
    `src は "images/${epId}/slide-XX.jpg"（XX はゼロ埋め 2 桁）で指定する。` +
    `speakerHint の内容をベースにセリフを 60 文字以上に膨らませること。`
  );
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // eslint-disable-next-line no-console
    console.error('❌ ANTHROPIC_API_KEY が設定されていません');
    process.exit(1);
  }

  const packageRoot = path.resolve(__dirname, '..');
  const inputDir = path.join(packageRoot, 'input');
  const outputPath = path.join(inputDir, `${args.epId}.yaml`);
  const contentDir = path.join(packageRoot, 'public', 'content');

  const logger = createLogger({ name: 'generate-script', level: 'info' });

  const llm = new AnthropicClient({ apiKey });
  const knowledge = new FileSystemKnowledgeRepo({ packageRoot });
  const infographics = new FileSystemInfographicResolver({ contentDir });
  const writer = new FileSystemScriptYamlWriter();
  const pastEpisodes = new FileSystemPastEpisodesResolver({ inputDir });

  const useCase = new GenerateScriptUseCase({
    llm,
    knowledge,
    infographics,
    writer,
    logger,
    pastEpisodes,
  });

  let researchFile = args.researchFile;
  let desc = args.desc;

  if (args.withExa) {
    const exaApiKey = process.env['EXA_API_KEY'] ?? '';
    const researcher = new ExaTopicResearcher(exaApiKey);
    logger.info({ topic: args.topic }, '[Exa] リサーチ開始...');
    const { markdown, sourceCount } = await researcher.research(args.topic, args.epId);
    const researchPath = path.join(inputDir, `${args.epId}_research.md`);
    fs.writeFileSync(researchPath, markdown, 'utf-8');
    logger.info({ sourceCount, researchPath }, '[Exa] リサーチ完了');
    researchFile = `input/${args.epId}_research.md`;
  }

  if (args.fromSlides) {
    const slidesAbsPath = path.isAbsolute(args.fromSlides)
      ? args.fromSlides
      : path.join(packageRoot, args.fromSlides);

    if (!fs.existsSync(slidesAbsPath)) {
      logger.error({ path: slidesAbsPath }, '--from-slides ファイルが見つかりません');
      process.exit(1);
    }

    const slidesJson = JSON.parse(fs.readFileSync(slidesAbsPath, 'utf-8')) as {
      slides?: SlideEntry[];
    };
    const slides = slidesJson.slides ?? [];

    // --html-slides: chart/stat/rich-panel ネイティブタイプ使用モード
    const slidesMarkdown = args.htmlSlides
      ? buildSlidesContextHtml(args.epId, slides)
      : buildSlidesContext(args.epId, slides);

    // 既存のリサーチコンテキストがある場合は結合する
    let combinedContent = slidesMarkdown;
    if (researchFile) {
      const absResearch = path.isAbsolute(researchFile)
        ? researchFile
        : path.join(packageRoot, researchFile);
      if (fs.existsSync(absResearch)) {
        const existing = fs.readFileSync(absResearch, 'utf-8');
        combinedContent = existing + '\n\n' + slidesMarkdown;
      }
    }

    const slidesContextPath = path.join(inputDir, `${args.epId}_slides_context.md`);
    fs.writeFileSync(slidesContextPath, combinedContent, 'utf-8');
    researchFile = `input/${args.epId}_slides_context.md`;

    if (!desc) {
      desc = args.htmlSlides
        ? buildSlidesModeDescHtml(slides.length)
        : buildSlidesModeDesc(args.epId, slides.length);
    }

    logger.info(
      { slideCount: slides.length, slidesContextPath, htmlSlides: args.htmlSlides },
      '[slides] スライドコンテキスト注入完了',
    );
  }

  const result = await useCase.execute({
    topic: args.topic,
    epId: args.epId,
    desc,
    researchFile,
    outputPath,
  });

  logger.info(
    {
      outputPath: result.outputPath,
      title: result.title,
      chapterCount: result.chapterCount,
      totalLines: result.totalLines,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      costUsd: result.costUsd,
      elapsedMs: result.elapsedMs,
      infographicsInjected: result.infographicsInjected,
    },
    'generate-script: done',
  );
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'generate-script', level: 'error' });
  const message = err instanceof Error ? err.message : String(err);
  logger.fatal({ err: message }, 'generate-script: fatal');
  process.exit(1);
});
