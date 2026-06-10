/**
 * scripts/analyze-winning-patterns.ts  (thin CLI shim)
 *
 * 競合コーパスから「勝ちパターン」を抽出し knowledge/winning-patterns.json に保存する
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/analyze-winning-patterns.ts
 *   npx ts-node --transpile-only scripts/analyze-winning-patterns.ts --dry-run
 *   npx ts-node --transpile-only scripts/analyze-winning-patterns.ts --top-n 50
 *
 * 前提:
 *   - fetch-competitor-corpus.ts 実行済み（knowledge/corpus/ が存在）
 *   - ANTHROPIC_API_KEY が .env または環境変数に設定済み
 *
 * ロジック本体は packages/adapters と packages/usecases に移設済み。
 * このファイルは argv パース → DI wiring → ユースケース呼び出しに専念する。
 */

import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';
import {
  AnthropicPatternAnalyzer,
  FileSystemCorpusReader,
  FileSystemPatternStore,
} from '@money-video/adapters/research';
import { AnalyzePatternsUseCase } from '@money-video/usecases/analyzePatterns';

// ─── argv パース ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');

const topNArg = argv.indexOf('--top-n');
const TOP_N = topNArg >= 0 ? parseInt(argv[topNArg + 1] ?? '50', 10) : 50;

// ─── パス定義 ────────────────────────────────────────────────────────────────

const packageRoot = path.resolve(__dirname, '..');
const rootDir = path.join(packageRoot, '..', '..');
const knowledgeDir = path.join(rootDir, 'knowledge');

const corpusDir = path.join(knowledgeDir, 'corpus');
const outputPath = path.join(knowledgeDir, 'winning-patterns.json');

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const logger = createLogger({ name: 'analyze-winning-patterns', level: 'info' });

  logger.info({ dryRun: DRY_RUN, topN: TOP_N }, '勝ちパターン分析開始');

  // DI wiring
  const useCase = new AnalyzePatternsUseCase({
    corpusReader: new FileSystemCorpusReader(),
    patternAnalyzer: new AnthropicPatternAnalyzer(),
    patternStore: new FileSystemPatternStore(),
  });

  const result = await useCase.execute({
    corpusDir,
    outputPath,
    topN: TOP_N,
    dryRun: DRY_RUN,
  });

  logger.info(
    {
      totalVideosAnalyzed: result.totalVideosAnalyzed,
      outputPath: result.outputPath,
    },
    '勝ちパターン分析完了',
  );
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'analyze-winning-patterns', level: 'error' });
  const message = err instanceof Error ? err.message : String(err);
  logger.fatal({ err: message }, 'analyze-winning-patterns: fatal');
  process.exit(1);
});
