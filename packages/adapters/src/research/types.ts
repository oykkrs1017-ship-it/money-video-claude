/**
 * research アダプター共有型定義
 *
 * adapters は usecases に依存しないため、ここで型を独立定義する。
 * usecases/researchTopic/ports.ts との shape 互換を手動で保つ。
 */

// ─── 競合チャンネル設定 ───────────────────────────────────────────────────────

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

// ─── 動画・ニュース ───────────────────────────────────────────────────────────

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

/** 為替などのマクロ1次データのスナップショット（キー不要ソース由来） */
export interface MacroSnapshot {
  fetched_at: string;
  /** データ提供元（例: 'ECB (Frankfurter)'） */
  source: string;
  /** レートの基準日（ECB 公表日, YYYY-MM-DD）。取得不能時 null */
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

// ─── コーパス ─────────────────────────────────────────────────────────────────

export interface CorpusVideoMeta {
  id: string;
  title: string;
  channel: string;
  channelHandle: string;
  views: number | null;
  likes: number | null;
  published: string | null;
  /** 秒数 */
  duration: number | null;
  url: string;
  description: string;
  tags: string[];
  collectedAt: string;
}

// ─── パターン分析 ─────────────────────────────────────────────────────────────

export interface VideoMetaForAnalysis {
  id: string;
  title: string;
  channel: string;
  channelHandle: string;
  views: number | null;
  published: string | null;
  duration: number | null;
  url: string;
  description: string;
  tags: string[];
}

export interface ThumbnailPattern {
  colorScheme: string;
  textDensity: string;
  composition: string;
  facesPresent: boolean;
  numberHighlight: boolean;
  commonElements: string[];
  avoidElements: string[];
}

/** usecases/analyzePatterns/ports.ts TitlePattern.type と同一 */
export type TitlePatternType =
  | 'question'
  | 'number'
  | 'negative'
  | 'proper_noun'
  | 'urgency'
  | 'other';

export interface WinningPatterns {
  analyzedAt: string;
  totalVideosAnalyzed: number;
  topViewsThreshold: number;
  titlePatterns: Array<{
    type: TitlePatternType;
    label: string;
    examples: string[];
    frequency: number;
    avgViews: number;
  }>;
  hookPatterns: Array<{
    type: string;
    label: string;
    description: string;
    examples: string[];
    frequency: number;
  }>;
  thumbnailPatterns: ThumbnailPattern;
  structureInsights: string[];
  recommendedHooks: string[];
  avoidPatterns: string[];
  rawAnalysis: {
    titleAnalysis: string;
    hookAnalysis: string;
    thumbnailAnalysis: string;
  };
}
