/**
 * scripts/research-topics.ts  (thin CLI shim)
 *
 * YouTubeリサーチ + ニュース検索 → knowledge/topic-research.json に保存
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/research-topics.ts            # 無料ソースのみ（GDELT + Frankfurter）
 *   npx ts-node --transpile-only scripts/research-topics.ts --with-exa # Exa も併用（課金あり）
 *   npx ts-node --transpile-only scripts/research-topics.ts --dry-run
 *   npx ts-node --transpile-only scripts/research-topics.ts --no-youtube
 *   npx ts-node --transpile-only scripts/research-topics.ts --no-news
 *
 * 課金ポリシー: ニュースは既定で GDELT（キー不要・無料）のみ。
 *   Exa（従量課金）は --with-exa を明示したときだけ併用する。
 *   為替の1次データ（Frankfurter/ECB）は無料のため常時取得。
 *
 * ロジック本体は packages/adapters と packages/usecases に移設済み。
 * このファイルは argv パース → DI wiring → ユースケース呼び出しに専念する。
 */

import * as path from 'path';
import { createLogger } from '@money-video/shared-ts';
import {
  CompetitorChannelConfigReader,
  YtDlpCompetitorVideoFetcher,
  ExaNewsFetcher,
  GdeltNewsFetcher,
  CompositeNewsFetcher,
  MacroSnapshotFetcher,
  RssFeedFetcher,
  FileSystemResearchStore,
  TopicPromptFileUpdater,
  RedditPostFetcher,
  JinaEnrichedGdeltFetcher,
} from '@money-video/adapters/research';
import { ResearchTopicUseCase } from '@money-video/usecases/researchTopic';

// ─── argv パース ──────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes('--dry-run');
const SKIP_YOUTUBE = argv.includes('--no-youtube');
const SKIP_NEWS = argv.includes('--no-news');
/** Exa（従量課金）を併用するか。既定 false＝無料ソースのみ */
const WITH_EXA = argv.includes('--with-exa');
/** Reddit 投資コミュニティ感情データを追加するか。rdt-cli 要インストール */
const WITH_REDDIT = argv.includes('--with-reddit');
/** Jina Reader で GDELT 記事の本文を取得するか（Exa 不要で全文取得） */
const WITH_JINA = argv.includes('--with-jina');

// ─── パス定義 ────────────────────────────────────────────────────────────────

const packageRoot = path.resolve(__dirname, '..');
const rootDir = path.join(packageRoot, '..', '..');
const knowledgeDir = path.join(rootDir, 'knowledge');

const configPath = path.join(knowledgeDir, 'competitor-channels.yaml');
const outputPath = path.join(knowledgeDir, 'topic-research.json');
const promptPath = path.join(packageRoot, 'input', 'TOPIC_PROPOSAL_PROMPT.md');

// ─── main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const logger = createLogger({ name: 'research-topics', level: 'info' });

  logger.info(
    {
      dryRun: DRY_RUN,
      skipYoutube: SKIP_YOUTUBE,
      skipNews: SKIP_NEWS,
      withExa: WITH_EXA,
      withReddit: WITH_REDDIT,
      withJina: WITH_JINA,
    },
    'リサーチ開始',
  );

  // ニュースソース構築
  // - 既定: GDELT（キー不要・無料）
  // - --with-jina: GDELT 結果を Jina Reader で記事本文に置換（Exa 不要で全文取得）
  // - --with-exa: Exa（課金）を先頭に追加
  // - --with-reddit: r/investing 等から投資家感情・トレンドを追加
  const gdeltFetcher = WITH_JINA ? new JinaEnrichedGdeltFetcher() : new GdeltNewsFetcher();
  const exaFetchers = WITH_EXA ? [new ExaNewsFetcher()] : [];
  const redditFetchers = WITH_REDDIT ? [new RedditPostFetcher()] : [];
  const newsFetcher = new CompositeNewsFetcher([...exaFetchers, gdeltFetcher, ...redditFetchers]);

  // DI wiring
  const useCase = new ResearchTopicUseCase({
    channelConfigReader: new CompetitorChannelConfigReader(),
    videoFetcher: new YtDlpCompetitorVideoFetcher(),
    newsFetcher,
    researchStore: new FileSystemResearchStore(),
    topicPromptUpdater: new TopicPromptFileUpdater(),
    // 為替の1次データ（ECB/Frankfurter・キー不要・無料）
    macroFetcher: new MacroSnapshotFetcher(),
    // 政府・中銀の1次プレス（日銀/Fed/金融庁/経産省・キー不要・無料）
    feedFetcher: new RssFeedFetcher(),
  });

  const result = await useCase.execute({
    configPath,
    outputPath,
    promptPath,
    skipYoutube: SKIP_YOUTUBE,
    skipNews: SKIP_NEWS,
    dryRun: DRY_RUN,
  });

  logger.info(
    {
      competitorVideoCount: result.competitorVideoCount,
      newsItemCount: result.newsItemCount,
      outputPath: result.outputPath,
    },
    'リサーチ完了',
  );

  logger.info('次のステップ: /research-topic スキルでトピック提案を生成してください');
}

main().catch((err: unknown) => {
  const logger = createLogger({ name: 'research-topics', level: 'error' });
  const message = err instanceof Error ? err.message : String(err);
  logger.fatal({ err: message }, 'research-topics: fatal');
  process.exit(1);
});
