/**
 * pipeline.ts
 * AIマネー研究所 動画生成パイプライン
 * 台本生成 → 音声生成 → エピソード構築 → レンダリング → YouTube投稿
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/pipeline.ts [options]
 *
 * オプション:
 *   --topic <topic>      トピック（省略時: 'auto'）
 *   --type <type>        構成タイプ（省略時: 'random'）
 *   --upload             YouTube に投稿する
 *   --draft              投稿を非公開にする（--upload と併用）
 *   --auto               台本確認をスキップして自動続行
 *   --batch <n>          n 本をバッチ生成（--auto が有効になる）
 *   --resume             前回の途中から再開
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { Episode } from '../src/types/episode';
import { CompositionType } from '../src/types/episode';
import { assignTypesForBatch } from '../src/utils/templateSelector';
import type { EpisodeScorecard } from '../../../packages/shared/src/scorecard';
import { saveScorecard } from '../../../packages/shared/src/scorecard';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface PipelineState {
  episodeId: string;
  completedSteps: string[];
  startedAt: string;
}

interface StepTiming {
  step: string;
  durationMs: number;
}

interface PipelineOptions {
  upload: boolean;
  draft: boolean;
  auto: boolean;
  resume: boolean;
}

// ─── CLI 引数パース ───────────────────────────────────────────────────────────

function parseArgs(): {
  topic: string;
  type: CompositionType | 'random';
  upload: boolean;
  draft: boolean;
  auto: boolean;
  batch: number | undefined;
  resume: boolean;
} {
  const args = process.argv.slice(2);

  function getArg(flag: string): string | undefined {
    const i = args.indexOf(flag);
    return i >= 0 && args[i + 1] ? args[i + 1] : undefined;
  }

  return {
    topic: getArg('--topic') ?? 'auto',
    type: (getArg('--type') ?? 'random') as CompositionType | 'random',
    upload: args.includes('--upload'),
    draft: args.includes('--draft'),
    auto: args.includes('--auto'),
    batch: getArg('--batch') ? parseInt(getArg('--batch')!, 10) : undefined,
    resume: args.includes('--resume'),
  };
}

// ─── パイプライン状態管理 ─────────────────────────────────────────────────────

const STATE_PATH = path.join(__dirname, '../.pipeline-state.json');

function loadPipelineState(episodeId: string): PipelineState | null {
  if (!fs.existsSync(STATE_PATH)) return null;
  const state: PipelineState = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
  return state.episodeId === episodeId ? state : null;
}

function savePipelineState(state: PipelineState): void {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf-8');
}

function markStepComplete(episodeId: string, step: string): void {
  const existing = loadPipelineState(episodeId);
  const state: PipelineState = existing ?? {
    episodeId,
    completedSteps: [],
    startedAt: new Date().toISOString(),
  };
  if (!state.completedSteps.includes(step)) {
    state.completedSteps.push(step);
  }
  savePipelineState(state);
}

function isStepComplete(episodeId: string, step: string): boolean {
  const state = loadPipelineState(episodeId);
  return state?.completedSteps.includes(step) ?? false;
}

// ─── ステップ実行 ─────────────────────────────────────────────────────────────

function runStep(label: string, command: string): number {
  const start = Date.now();
  console.log(`\n▶ ${label}...`);
  try {
    execSync(command, {
      cwd: path.join(__dirname, '..'),
      stdio: 'inherit',
    });
  } catch {
    throw new Error(`${label} に失敗しました`);
  }
  return Date.now() - start;
}

// ─── 台本確認 ─────────────────────────────────────────────────────────────────

async function confirmScript(episodeId: string): Promise<'continue' | 'regenerate' | 'abort'> {
  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  const episode: Episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));

  console.log('\n📋 生成された台本:');
  console.log('─────────────────────────────');
  console.log(`タイトル: ${episode.title}`);
  console.log(`トピック: ${episode.topic}`);
  console.log(`構成タイプ: ${episode.compositionType}`);
  console.log('\nセリフ一覧:');
  episode.sections.forEach((section) => {
    console.log(`\n[${section.name}]`);
    section.lines.forEach((line) => {
      const name = line.character === 'pon' ? 'ポン先生' : 'マロちゃん';
      console.log(`  ${name}: ${line.text}`);
    });
  });
  console.log('─────────────────────────────');

  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question('\n続行しますか？ [y=続行 / n=台本再生成 / q=中止]: ', (answer) => {
      rl.close();
      if (answer.toLowerCase() === 'y') resolve('continue');
      else if (answer.toLowerCase() === 'n') resolve('regenerate');
      else resolve('abort');
    });
  });
}

// ─── スコアカード記録 ─────────────────────────────────────────────────────────

function computeDirectiveHash(): string {
  const directivePath = path.join(__dirname, '../../../directive.yaml');
  if (!fs.existsSync(directivePath)) return 'unknown';
  const content = fs.readFileSync(directivePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

function recordScorecard(
  episodeId: string,
  renderDurationMs: number,
  timings: StepTiming[]
): void {
  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  if (!fs.existsSync(episodePath)) return;

  const episode: Episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));

  const scorecard: EpisodeScorecard = {
    episodeId,
    channel: 'ai-money-shorts',
    recordedAt: new Date().toISOString(),
    directiveHash: computeDirectiveHash(),
    hypothesisId: null,
    seed: episode.variationSeed ? parseInt(episode.variationSeed, 16) || 0 : undefined,
    templateType: episode.compositionType,
    production: {
      scriptReviewLoops: 1,
      reviewIssueCount: 0,
      voiceSynthSuccessRate: 1.0,
      renderDurationSec: Math.round(renderDurationMs / 1000),
      costUsdEstimate: 0.07,
    },
    verdict: 'PENDING',
    lessonIds: [],
  };

  const rootDir = path.resolve(__dirname, '../../..');
  saveScorecard(rootDir, scorecard);
  console.log(`\n📊 スコアカードを記録しました: brain/scorecards/${episodeId}.json`);
}

// ─── 最新エピソードID取得 ─────────────────────────────────────────────────────

function getLatestEpisodeId(): string {
  const episodesDir = path.join(__dirname, '../src/data/episodes');
  if (!fs.existsSync(episodesDir)) {
    throw new Error(`エピソードディレクトリが存在しません: ${episodesDir}`);
  }
  const files = fs.readdirSync(episodesDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .reverse();
  if (files.length === 0) {
    throw new Error('エピソードファイルが見つかりません');
  }
  return files[0].replace('.json', '');
}

// ─── 単体エピソード実行 ───────────────────────────────────────────────────────

async function runSingleEpisode(
  topic: string,
  type: CompositionType | 'random',
  opts: PipelineOptions
): Promise<{ episodeId: string; timings: StepTiming[] }> {
  const timings: StepTiming[] = [];

  // Step 1: 台本生成
  let episodeId = '';
  const typeFlag = type === 'random' ? '' : `--type ${type}`;
  const generateCmd = `npx ts-node --transpile-only scripts/generate-script.ts --topic "${topic}" ${typeFlag}`.trim();

  let scriptAccepted = false;
  let maxRetry = 3;

  while (!scriptAccepted && maxRetry > 0) {
    const ms = runStep('台本生成', generateCmd);
    timings.push({ step: '台本生成', durationMs: ms });

    episodeId = getLatestEpisodeId();

    if (opts.auto) {
      scriptAccepted = true;
    } else {
      const answer = await confirmScript(episodeId);
      if (answer === 'continue') {
        scriptAccepted = true;
      } else if (answer === 'abort') {
        console.log('⛔ 中止しました');
        process.exit(0);
      }
      // 'regenerate' の場合はループ継続
      maxRetry--;
    }
  }

  if (!episodeId) throw new Error('エピソードIDを取得できませんでした');
  markStepComplete(episodeId, 'script');

  // Step 2: 音声生成（resume 時はスキップ可能）
  if (!opts.resume || !isStepComplete(episodeId, 'voice')) {
    const voiceMs = runStep(
      '音声生成',
      `npx ts-node --transpile-only scripts/generate-voice.ts --episode ${episodeId}`
    );
    timings.push({ step: '音声生成', durationMs: voiceMs });
    markStepComplete(episodeId, 'voice');
  } else {
    console.log('\n⏩ 音声生成をスキップ（完了済み）');
  }

  // Step 3: エピソード構築
  if (!opts.resume || !isStepComplete(episodeId, 'build')) {
    const buildMs = runStep(
      'エピソード構築',
      `npx ts-node --transpile-only scripts/build-episode.ts --episode ${episodeId}`
    );
    timings.push({ step: 'エピソード構築', durationMs: buildMs });
    markStepComplete(episodeId, 'build');
  } else {
    console.log('\n⏩ エピソード構築をスキップ（完了済み）');
  }

  // Step 4: レンダリング
  let renderDurationMs = 0;
  if (!opts.resume || !isStepComplete(episodeId, 'render')) {
    renderDurationMs = runStep(
      'レンダリング',
      `npx ts-node --transpile-only scripts/render-video.ts --episode ${episodeId}`
    );
    timings.push({ step: 'レンダリング', durationMs: renderDurationMs });
    markStepComplete(episodeId, 'render');
    // スコアカードを記録（制作時メトリクス）
    recordScorecard(episodeId, renderDurationMs, timings);

    // Step 4.5: QCスティル自動確認
    console.log('\n▶ QCスティル確認...');
    try {
      execSync(
        `npx ts-node --transpile-only scripts/qc-still.ts --episode ${episodeId}`,
        { cwd: path.join(__dirname, '..'), stdio: 'inherit' }
      );
    } catch {
      console.warn('\n⚠️  QC確認でエラーが発生しました（レンダリングは完了）');
    }
  } else {
    console.log('\n⏩ レンダリングをスキップ（完了済み）');
  }

  // Step 5: アップロード（任意）
  if (opts.upload) {
    if (!opts.resume || !isStepComplete(episodeId, 'upload')) {
      const draftFlag = opts.draft ? '--draft' : '';
      const uploadMs = runStep(
        'YouTube投稿',
        `npx ts-node --transpile-only scripts/upload-youtube.ts --episode ${episodeId} ${draftFlag}`.trim()
      );
      timings.push({ step: 'YouTube投稿', durationMs: uploadMs });
      markStepComplete(episodeId, 'upload');
    } else {
      console.log('\n⏩ YouTube投稿をスキップ（完了済み）');
    }
  }

  return { episodeId, timings };
}

// ─── サマリー表示 ─────────────────────────────────────────────────────────────

function printTimingSummary(timings: StepTiming[]): void {
  console.log('\n⏱️  パイプライン所要時間:');
  console.log('─────────────────────────────────');
  let total = 0;
  timings.forEach(({ step, durationMs }) => {
    const sec = (durationMs / 1000).toFixed(1);
    console.log(`  ${step.padEnd(16)}: ${sec}s`);
    total += durationMs;
  });
  console.log('──────────────────────────────────');
  const totalSec = total / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  console.log(`  合計           : ${totalSec.toFixed(1)}s (${min}分${sec}秒)`);
}

// ─── メイン ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs();

  console.log('🚀 AIマネー研究所 パイプライン開始');
  console.log(`📌 トピック: ${args.topic}`);
  console.log(`🎬 構成タイプ: ${args.type}`);
  if (args.batch) console.log(`📦 バッチ数: ${args.batch}`);
  if (args.upload) console.log(`📤 YouTube投稿: ${args.draft ? 'ドラフト(非公開)' : '公開'}`);

  if (args.batch && args.batch > 1) {
    // バッチ実行
    const types = assignTypesForBatch(args.batch);
    const allTimings: StepTiming[] = [];

    for (let i = 0; i < args.batch; i++) {
      console.log('\n\n═══════════════════════════════');
      console.log(`📦 バッチ ${i + 1}/${args.batch}`);
      console.log('═══════════════════════════════');
      const { timings } = await runSingleEpisode(args.topic, types[i], {
        ...args,
        auto: true, // バッチは自動
      });
      allTimings.push(...timings);
    }

    printTimingSummary(allTimings);
  } else {
    // 単体実行
    const { timings } = await runSingleEpisode(args.topic, args.type, {
      upload: args.upload,
      draft: args.draft,
      auto: args.auto,
      resume: args.resume,
    });
    printTimingSummary(timings);
  }

  console.log('\n🎉 パイプライン完了！');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n❌ パイプラインエラー:', message);
  process.exit(1);
});
