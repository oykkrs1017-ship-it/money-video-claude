/**
 * scripts/fetch-competitor-corpus.ts  (thin CLI shim)
 *
 * 競合チャンネルの動画メタデータ・サムネイル・字幕をコーパスとして収集する
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/fetch-competitor-corpus.ts
 *   npx ts-node --transpile-only scripts/fetch-competitor-corpus.ts --top 20
 *   npx ts-node --transpile-only scripts/fetch-competitor-corpus.ts --dry-run
 *   npx ts-node --transpile-only scripts/fetch-competitor-corpus.ts --channel "@ryogakucho"
 *
 * ロジック本体は packages/adapters と packages/usecases に移設済み。
 * このファイルは argv パース → DI wiring → ユースケース呼び出しに専念する。
 */

import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';
import {
  CompetitorChannelConfigReader,
  YtDlpCorpusFetcher,
  FileSystemCorpusIndexWriter,
} from '@money-video/adapters/research';
import { FetchCorpusUseCase } from '@money-video/usecases/fetchCorpus';

// ─── argv パース ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');

const topArg = argv.indexOf('--top');
const TOP_N = topArg >= 0 ? parseInt(argv[topArg + 1] ?? '15', 10) : 15;

const channelArg = argv.indexOf('--channel');
const FILTER_CHANNEL = channelArg >= 0 ? argv[channelArg + 1] : undefined;

// ─── パス定義 ────────────────────────────────────────────────────────────────

const packageRoot = path.resolve(__dirname, '..');
const rootDir = path.join(packageRoot, '..', '..');
const knowledgeDir = path.join(rootDir, 'knowledge');

const configPath = path.join(knowledgeDir, 'competitor-channels.yaml');
const corpusDir = path.join(knowledgeDir, 'corpus');

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const logger = createLogger({ name: 'fetch-competitor-corpus', level: 'info' });

  logger.info({ dryRun: DRY_RUN, topN: TOP_N, filterChannel: FILTER_CHANNEL }, 'コーパス収集開始');

  // DI wiring
  const useCase = new FetchCorpusUseCase({
    channelConfigReader: new CompetitorChannelConfigReader(),
    corpusVideoFetcher: new YtDlpCorpusFetcher(),
    corpusIndexWriter: new FileSystemCorpusIndexWriter(),
  });

  const result = await useCase.execute({
    configPath,
    corpusDir,
    topN: TOP_N,
    filterChannel: FILTER_CHANNEL,
    dryRun: DRY_RUN,
  });

  logger.info(
    {
      totalVideos: result.totalVideos,
      newVideos: result.newVideos,
      skippedVideos: result.skippedVideos,
    },
    'コーパス収集完了',
  );

  logger.info('次のステップ: npx ts-node --transpile-only scripts/analyze-winning-patterns.ts');
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'fetch-competitor-corpus', level: 'error' });
  const message = err instanceof Error ? err.message : String(err);
  logger.fatal({ err: message }, 'fetch-competitor-corpus: fatal');
  process.exit(1);
});
