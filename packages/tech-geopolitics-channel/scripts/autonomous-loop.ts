/**
 * scripts/autonomous-loop.ts — thin shim
 *
 * 実際のロジックは AutonomousLoopUseCase に委譲。
 * このファイルは: CLI 引数解析 → DI ワイヤリング → usecase.execute() のみ。
 *
 * 使い方:
 *   npm run loop -- --topics "トピック1" "トピック2"
 *   npm run loop -- --topics-file topics.txt
 *   npm run loop -- --dry-run
 *   npm run loop -- --force   # auto_loop_enabled=false を無視
 */

import * as fs from 'fs';
import * as path from 'path';
import { AutonomousLoopUseCase } from '../../../packages/usecases/src/orchestrate/AutonomousLoopUseCase';
import {
  DirectiveYamlReader,
  DailyCostTsvReader,
  InputDirEpisodeIdGenerator,
  SubprocessScriptRunner,
  SubprocessVoiceRunner,
  FileSystemScorecardWriter,
  FileSystemTsvAppender,
} from '../../../packages/adapters/src/brain';

// ─── 定数 ────────────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..', '..', '..'); // money_video_cluade/
const PACKAGE_DIR = path.join(__dirname, '..'); // tech-geopolitics-channel/
const SCRIPTS_DIR = __dirname; // scripts/

// ─── CLI 引数解析 ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');
const maxArg = args.includes('--max')
  ? parseInt(args[args.indexOf('--max') + 1] ?? '3', 10)
  : undefined;

function parseTopics(): string[] {
  if (args.includes('--topics-file')) {
    const file = args[args.indexOf('--topics-file') + 1];
    if (!file || !fs.existsSync(file)) {
      console.error(`❌ トピックファイルが見つかりません: ${file ?? '(未指定)'}`);
      process.exit(1);
    }
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }

  const topicsIdx = args.indexOf('--topics');
  if (topicsIdx >= 0) {
    return args.slice(topicsIdx + 1).filter((a) => !a.startsWith('--'));
  }

  console.error('使い方: npm run loop -- --topics "トピック1" "トピック2"');
  process.exit(1);
}

// ─── DI ワイヤリング ──────────────────────────────────────────────────────────
const useCase = new AutonomousLoopUseCase({
  directiveReader: new DirectiveYamlReader(ROOT_DIR),
  dailyCostReader: new DailyCostTsvReader(ROOT_DIR),
  episodeIdGenerator: new InputDirEpisodeIdGenerator(PACKAGE_DIR),
  scriptRunner: new SubprocessScriptRunner(SCRIPTS_DIR, PACKAGE_DIR),
  voiceRunner: new SubprocessVoiceRunner(SCRIPTS_DIR, PACKAGE_DIR),
  scorecardWriter: new FileSystemScorecardWriter(ROOT_DIR),
  tsvAppender: new FileSystemTsvAppender(ROOT_DIR),
});

// ─── メイン ───────────────────────────────────────────────────────────────────
(async () => {
  const topics = parseTopics();
  const directive = new DirectiveYamlReader(ROOT_DIR).read();

  console.log(`\n🤖 自律ループ開始`);
  console.log(`   トピック数: ${topics.length} → 今回処理: ${Math.min(topics.length, maxArg ?? directive.maxEpisodesPerLoop)}件`);
  console.log(`   費用上限: $${directive.maxDailyCostUsd}/日`);
  if (dryRun) console.log(`   モード: DRY-RUN（実際の API 呼び出しなし）\n`);

  try {
    const result = await useCase.execute({
      topics,
      maxEpisodesOverride: maxArg,
      dryRun,
      force,
    });

    console.log(`\n✅ ループ完了`);
    console.log(`   処理: ${result.totalEpisodes}件 / 成功: ${result.successCount}件`);
    console.log(`   推定コスト: $${result.totalCostUsd.toFixed(2)}`);
    console.log(`\n次のステップ:`);
    console.log(`   1. input/*.yaml で台本を確認`);
    console.log(`   2. still を確認後、npm run pipeline でレンダリング`);
    console.log(`   3. アップロード後に collect-analytics.ts でメトリクス収集`);
  } catch (err) {
    console.error(`❌ エラー: ${(err as Error).message}`);
    process.exit(1);
  }
})();
