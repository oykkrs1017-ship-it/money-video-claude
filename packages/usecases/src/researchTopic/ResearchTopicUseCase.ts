/**
 * ResearchTopicUseCase
 *
 * 競合チャンネルリサーチ + ニュース検索 → トピックリサーチ結果を保存する。
 *
 * フロー:
 *   1. competitor-channels.yaml を読み込む
 *   2. （skipYoutube=false）yt-dlp で競合動画を取得
 *   3. （skipNews=false）Exa API でニュース検索
 *   4. topic-research.json に保存
 *   5. TOPIC_PROPOSAL_PROMPT.md を更新（promptPath が指定された場合）
 */

import type {
  CompetitorVideo,
  MacroSnapshot,
  NewsItem,
  ResearchTopicDeps,
  ResearchTopicInput,
  ResearchTopicResult,
  TopicResearch,
} from './ports';

const DEFAULT_RATE_LIMIT_MS = 2000;
const DEFAULT_NEWS_RATE_LIMIT_MS = 500;

export class ResearchTopicUseCase {
  private readonly deps: ResearchTopicDeps;

  constructor(deps: ResearchTopicDeps) {
    this.deps = deps;
  }

  async execute(input: ResearchTopicInput): Promise<ResearchTopicResult> {
    const {
      configPath,
      outputPath,
      promptPath,
      skipYoutube = false,
      skipNews = false,
      dryRun = false,
    } = input;

    const {
      channelConfigReader,
      videoFetcher,
      newsFetcher,
      researchStore,
      topicPromptUpdater,
      macroFetcher,
      feedFetcher,
    } = this.deps;

    // ─── 設定読み込み ─────────────────────────────────────────────────────────
    const config = await channelConfigReader.read(configPath);
    const maxVideos = config.settings?.max_videos_per_channel ?? 10;
    const lookbackDays = config.settings?.news_lookback_days ?? 7;
    const maxNews = config.settings?.max_news_per_keyword ?? 5;

    const competitorVideos: CompetitorVideo[] = [];
    const newsItems: NewsItem[] = [];

    // ─── Phase 1: YouTube 競合チャンネル ─────────────────────────────────────
    if (!skipYoutube) {
      if (videoFetcher.isAvailable()) {
        for (const channel of config.channels) {
          const videos = videoFetcher.fetch(channel, maxVideos, dryRun);
          competitorVideos.push(...videos);

          // レートリミット対策（dryRun 時はスキップ）
          if (!dryRun) {
            await delay(DEFAULT_RATE_LIMIT_MS);
          }
        }
      }
    }

    // ─── Phase 2: ニュース検索 ────────────────────────────────────────────────
    if (!skipNews) {
      if (newsFetcher.isAvailable()) {
        const keywords = config.keywords_for_news ?? [];
        for (const keyword of keywords) {
          if (dryRun) {
            newsItems.push({
              keyword,
              title: `[DRY-RUN] ${keyword} に関するニュース`,
              url: 'https://example.com',
              summary: 'DRY-RUN モードのサンプルニュース',
              published: new Date().toISOString().slice(0, 10),
            });
            continue;
          }

          const items = await newsFetcher.searchByKeyword(keyword, lookbackDays, maxNews);
          newsItems.push(...items);
          await delay(DEFAULT_NEWS_RATE_LIMIT_MS);
        }
      }
    }

    // ─── Phase 2.6: 政府・中銀の1次プレスフィード（無料・キーワード非依存）──────
    if (!skipNews && !dryRun && feedFetcher?.isAvailable()) {
      const feedItems = await feedFetcher.fetchAll(lookbackDays, maxNews);
      newsItems.push(...feedItems);
    }

    // ─── Phase 2.5: マクロ1次データ ─────────────────────────────────────────────
    let macroSnapshot: MacroSnapshot | null = null;
    if (macroFetcher && !dryRun) {
      macroSnapshot = await macroFetcher.fetchSnapshot();
    }

    // ─── Phase 3: 保存 ────────────────────────────────────────────────────────
    const research: TopicResearch = {
      researched_at: new Date().toISOString(),
      competitor_videos: competitorVideos,
      news_items: newsItems,
      macro_snapshot: macroSnapshot,
      generated_proposals: null,
    };

    if (!dryRun) {
      researchStore.save(outputPath, research);
    }

    // ─── Phase 4: TOPIC_PROPOSAL_PROMPT.md 更新 ───────────────────────────────
    if (promptPath) {
      topicPromptUpdater.update(promptPath, research, dryRun);
    }

    return {
      competitorVideoCount: competitorVideos.length,
      newsItemCount: newsItems.length,
      outputPath,
    };
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
