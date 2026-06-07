/**
 * scripts/new-episode.ts
 *
 * 統合パイプライン: トピック選定 → 台本生成 → 音声/画像/インフォグラフィック生成
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/new-episode.ts            # Studio 起動で確認（無料）
 *   npx ts-node --transpile-only scripts/new-episode.ts --fresh    # ニュース再取得あり（無料: GDELT のみ）
 *   npx ts-node --transpile-only scripts/new-episode.ts --render   # MP4 レンダリングまで実行
 *   npx ts-node --transpile-only scripts/new-episode.ts --with-exa # 台本のExa深掘りリサーチを有効化（課金あり）
 *
 * 課金ポリシー: 既定で無課金（トピック調査は GDELT・無料）。
 *   台本の Exa 全文深掘りリサーチは --with-exa を明示したときだけ実行する。
 *
 * 実行順序:
 *   1. ep ID 自動採番
 *   2. select-topic.ts（インタラクティブ）→ input/next-topic.json
 *   3. generate-script.ts --topic <title> --ep <epId> [--with-exa]
 *   4. generate.ts input/<epId>.yaml [--render | (Studio 起動)]
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env'), override: true });

import { GenerateScriptUseCase } from '@money-video/usecases/generateScript';
import { ExaTopicResearcher } from '@money-video/adapters/research';
import { makeScriptDeps } from './lib/useCaseDeps';

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET  = '\x1b[0m';

const packageRoot = path.resolve(__dirname, '..');
const inputDir    = path.join(packageRoot, 'input');
const scriptsDir  = __dirname;

// ─── argv パース ──────────────────────────────────────────────────────────────

const argv   = process.argv.slice(2);
const FRESH  = argv.includes('--fresh');
const RENDER = argv.includes('--render');
/** 台本生成で Exa 全文深掘りリサーチ（従量課金）を行うか。既定 false＝無課金 */
const WITH_EXA = argv.includes('--with-exa');

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function banner(step: number, title: string): void {
  // eslint-disable-next-line no-console
  console.log(`\n${BOLD}${CYAN}━━━ Step ${step}: ${title} ━━━${RESET}`);
}

function ok(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}

function info(msg: string): void {
  // eslint-disable-next-line no-console
  console.log(`${YELLOW}ℹ  ${msg}${RESET}`);
}

function run(cmd: string): void {
  execSync(cmd, { stdio: 'inherit', cwd: packageRoot });
}

/** input/ ディレクトリ内の最大 ep 番号 + 1 を返す */
function nextEpId(): string {
  const nums = fs
    .readdirSync(inputDir)
    .map((f) => f.match(/^ep(\d+)/)?.[1])
    .filter((n): n is string => n != null)
    .map(Number);
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `ep${String(next).padStart(3, '0')}`;
}

interface NextTopic {
  title: string;
  theme?: string;
  titleCandidates?: string[];
}

function readNextTopic(): NextTopic {
  const p = path.join(inputDir, 'next-topic.json');
  if (!fs.existsSync(p)) {
    // eslint-disable-next-line no-console
    console.error(`❌ input/next-topic.json が見つかりません`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(p, 'utf-8')) as NextTopic;
}

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`\n${BOLD}🎬 new-episode: 動画生成パイプライン開始${RESET}\n`);

  // ─── Step 1: ep ID 採番 ───────────────────────────────────────────────────

  banner(1, 'ep ID 自動採番');
  const epId = nextEpId();
  ok(`次のエピソード: ${epId}`);

  // ─── Step 2: トピック選定 ─────────────────────────────────────────────────

  banner(2, 'トピック選定');
  // --fresh のときだけニュース再取得。--with-exa 指定時は select-topic でも Exa（課金）を併用。
  const selectArgs = [FRESH ? '--fresh' : '', FRESH && WITH_EXA ? '--with-exa' : '']
    .filter(Boolean)
    .join(' ');
  run(
    `npx ts-node --transpile-only ${path.join(scriptsDir, 'select-topic.ts')} ${selectArgs}`.trimEnd(),
  );
  const topic = readNextTopic();
  ok(`選択済みトピック: ${topic.title}`);

  // ─── Step 3: 台本生成（直接 GenerateScriptUseCase 呼び出し）────────────────
  // execSync を廃止し同一プロセス内で呼ぶことでエラーが型付きスタックトレースとして伝播する。
  // --with-exa 時は ExaTopicResearcher を直接呼んで research ファイルを生成してから usecase に渡す。

  banner(3, WITH_EXA ? '台本生成 (GenerateScriptUseCase + Exa リサーチ)' : '台本生成 (GenerateScriptUseCase・無料)');

  let researchFile: string | undefined;
  if (WITH_EXA) {
    const exaApiKey = process.env['EXA_API_KEY'] ?? '';
    const researcher = new ExaTopicResearcher(exaApiKey);
    info('[Exa] リサーチ開始...');
    const { markdown } = await researcher.research(topic.title, epId);
    const researchPath = path.join(inputDir, `${epId}_research.md`);
    fs.writeFileSync(researchPath, markdown, 'utf-8');
    researchFile = `input/${epId}_research.md`;
    ok('[Exa] リサーチ完了');
  }

  const outputPath = path.join(inputDir, `${epId}.yaml`);
  const scriptUseCase = new GenerateScriptUseCase(makeScriptDeps());
  const scriptResult = await scriptUseCase.execute({
    topic: topic.title,
    epId,
    desc: topic.theme ?? '',
    researchFile,
    outputPath,
  });
  ok(`台本生成完了: input/${epId}.yaml (${scriptResult.totalLines} セリフ, $${scriptResult.costUsd.toFixed(4)})`);

  // ─── Step 4: SEO最適化 ────────────────────────────────────────────────────

  banner(4, 'SEO最適化 (optimize-seo)');
  run(
    `npx ts-node --transpile-only ${path.join(scriptsDir, 'optimize-seo.ts')} input/${epId}.yaml --auto`,
  );
  ok(`SEO最適化完了: input/${epId}.yaml`);

  // ─── Step 5: 音声 / 画像 / インフォグラフィック生成 ──────────────────────

  banner(5, '音声・画像・インフォグラフィック生成 (generate.ts)');

  const generateFlags = RENDER ? '--render --no-studio' : '--no-studio';
  run(
    `npx ts-node --transpile-only ${path.join(scriptsDir, 'generate.ts')} input/${epId}.yaml ${generateFlags}`,
  );

  // ─── Step 6: Shorts レンダリング（縦型・hook チャプター）──────────────────
  // 新規発見の最大入口。本編レンダリング時のみ実行し、失敗しても本編には影響させない。
  if (RENDER) {
    banner(6, 'Shorts レンダリング (render-shorts)');
    try {
      run(
        `npx ts-node --transpile-only ${path.join(scriptsDir, 'render-shorts.ts')} --ep ${epId}`,
      );
      ok(`Shorts レンダリング完了: output/${epId}_shorts.mp4`);
    } catch (err) {
      info(`Shorts レンダリングをスキップ（本編には影響なし）: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // ─── 完了メッセージ ───────────────────────────────────────────────────────

  // eslint-disable-next-line no-console
  console.log(`\n${BOLD}${GREEN}═══════════════════════════════════════${RESET}`);
  if (RENDER) {
    ok(`MP4 レンダリング完了: output/${epId}.mp4`);
    ok(`Shorts: output/${epId}_shorts.mp4（縦型・新規発見の入口）`);
    info('次のステップ: Still 確認 → 本編アップロード → Shorts アップロード');
    // eslint-disable-next-line no-console
    console.log(
      `\n  ${CYAN}# 本編アップロード${RESET}\n` +
      `  npx ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts \\\n` +
      `    output/${epId}.mp4 --input input/${epId}.yaml --thumbnail "output/thumbnail.jpeg"\n\n` +
      `  ${CYAN}# Shorts アップロード（タイトル末尾に #Shorts を付与）${RESET}\n` +
      `  npx ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts \\\n` +
      `    output/${epId}_shorts.mp4 --input input/${epId}.yaml --title "（本編タイトル）#Shorts"\n`,
    );
  } else {
    ok(`準備完了: ${epId}`);
    info('Still 確認 → レンダリング → アップロードの手順:');
    // eslint-disable-next-line no-console
    console.log(
      `\n  ${CYAN}# Still 確認 (3フレーム)${RESET}\n` +
      `  npx remotion still src/index.ts MainVideo output/check_hook.png --props input/script-input.json --frame 30\n\n` +
      `  ${CYAN}# レンダリング${RESET}\n` +
      `  npx remotion render src/index.ts MainVideo output/${epId}.mp4\n\n` +
      `  ${CYAN}# YouTube アップロード${RESET}\n` +
      `  npx ts-node -r tsconfig-paths/register --transpile-only scripts/upload-youtube.ts \\\n` +
      `    output/${epId}.mp4 --input input/${epId}.yaml --thumbnail "output/thumbnail.jpeg"\n`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(`${BOLD}${GREEN}═══════════════════════════════════════${RESET}\n`);
}

main().catch((err: unknown) => {
  // eslint-disable-next-line no-console
  console.error(`❌ new-episode: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
