/**
 * ResearchTopicUseCase のポート定義（依存性逆転）
 */

// ─── ドメイン型 ───────────────────────────────────────────────────────────────

export interface CompetitorChannel {
  handle: string;
  name: string;
  category: string;
  note: string;
}

export interface ResearchSettings {
  max_videos_per_channel: number;
  news_lookback_days: number;
  max_news_per_keyword: number;
}

export interface CompetitorChannelsConfig {
  channels: CompetitorChannel[];
  keywords_for_news: string[];
  settings: ResearchSettings;
}

export interface CompetitorVideo {
  channel: string;
  title: string;
  views: number | null;
  published: string | null;
  url: string;
  duration: string | null;
}

export interface NewsItem {
  keyword: string;
  title: string;
  url: string;
  summary: string;
  published: string | null;
}

/** 為替などのマクロ1次データのスナップショット（adapters/types.ts と shape 互換） */
export interface MacroSnapshot {
  fetched_at: string;
  source: string;
  as_of: string | null;
  fx: {
    usd_jpy: number | null;
    eur_jpy: number | null;
  };
}

export interface TopicResearch {
  researched_at: string;
  competitor_videos: CompetitorVideo[];
  news_items: NewsItem[];
  /** マクロ1次データ（オプション。未取得時は null/未設定） */
  macro_snapshot?: MacroSnapshot | null;
  generated_proposals: null;
}

// ─── ポート（インターフェース）───────────────────────────────────────────────

/**
 * 競合チャンネル設定を読み込む
 */
export interface ChannelConfigReader {
  read(configPath: string): Promise<CompetitorChannelsConfig>;
}

/**
 * 競合チャンネルの最新動画を取得する
 */
export interface CompetitorVideoFetcher {
  isAvailable(): boolean;
  fetch(
    channel: CompetitorChannel,
    maxVideos: number,
    dryRun: boolean,
  ): CompetitorVideo[];
}

/**
 * ニュース検索を行う
 */
export interface NewsFetcher {
  isAvailable(): boolean;
  searchByKeyword(
    keyword: string,
    lookbackDays: number,
    maxResults: number,
  ): Promise<NewsItem[]>;
}

/**
 * マクロ1次データ（為替など）のスナップショットを取得する
 */
export interface MacroFetcher {
  fetchSnapshot(): Promise<MacroSnapshot | null>;
}

/**
 * 政府・中銀の公式プレス RSS/Atom を取得する（キーワード非依存のフィード型）
 */
export interface FeedFetcher {
  isAvailable(): boolean;
  fetchAll(lookbackDays: number, maxPerFeed: number): Promise<NewsItem[]>;
}

/**
 * リサーチ結果を永続化する
 */
export interface ResearchStore {
  save(outputPath: string, research: TopicResearch): void;
}

/**
 * トピック提案プロンプトを更新する
 */
export interface TopicPromptUpdater {
  update(promptPath: string, research: TopicResearch, dryRun: boolean): void;
}

// ─── UseCase の入出力 ────────────────────────────────────────────────────────

export interface ResearchTopicInput {
  configPath: string;
  outputPath: string;
  /** TOPIC_PROPOSAL_PROMPT.md のパス（オプション） */
  promptPath?: string;
  skipYoutube?: boolean;
  skipNews?: boolean;
  dryRun?: boolean;
}

export interface ResearchTopicResult {
  competitorVideoCount: number;
  newsItemCount: number;
  outputPath: string;
}

export interface ResearchTopicDeps {
  channelConfigReader: ChannelConfigReader;
  videoFetcher: CompetitorVideoFetcher;
  newsFetcher: NewsFetcher;
  researchStore: ResearchStore;
  topicPromptUpdater: TopicPromptUpdater;
  /** マクロ1次データ取得（オプション。未指定なら macro_snapshot は付与しない） */
  macroFetcher?: MacroFetcher;
  /** 政府・中銀プレスフィード取得（オプション。未指定なら取得しない・無料） */
  feedFetcher?: FeedFetcher;
}
