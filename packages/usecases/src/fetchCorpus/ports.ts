/**
 * FetchCorpusUseCase のポート定義
 */

import type { CompetitorChannel, CompetitorChannelsConfig } from '../researchTopic/ports';

// ─── 再エクスポート（依存関係の局所化）──────────────────────────────────────
export type { CompetitorChannel, CompetitorChannelsConfig };

// ─── ドメイン型 ───────────────────────────────────────────────────────────────

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

// ─── ポート ───────────────────────────────────────────────────────────────────

/**
 * 競合チャンネル設定を読み込む（researchTopic と共有）
 */
export type { ChannelConfigReader } from '../researchTopic/ports';

/**
 * yt-dlp などで YouTube コーパス（メタデータ・サムネ・字幕）を収集する
 */
export interface CorpusVideoFetcher {
  isAvailable(): boolean;
  listVideoIds(
    channel: CompetitorChannel,
    topN: number,
    dryRun: boolean,
  ): string[];
  fetchVideoCorpus(
    videoId: string,
    channel: CompetitorChannel,
    outputDir: string,
    dryRun: boolean,
  ): CorpusVideoMeta | null;
}

/**
 * コーパスインデックスを保存する
 */
export interface CorpusIndexWriter {
  write(
    corpusDir: string,
    channels: CompetitorChannel[],
    metadata: CorpusVideoMeta[],
    totalNew: number,
    dryRun: boolean,
  ): void;
}

// ─── UseCase 入出力 ──────────────────────────────────────────────────────────

export interface FetchCorpusInput {
  configPath: string;
  corpusDir: string;
  topN?: number;
  /** 特定チャンネルのみ取得（handle で指定） */
  filterChannel?: string;
  dryRun?: boolean;
}

export interface FetchCorpusResult {
  totalVideos: number;
  newVideos: number;
  skippedVideos: number;
}

export interface FetchCorpusDeps {
  channelConfigReader: import('../researchTopic/ports').ChannelConfigReader;
  corpusVideoFetcher: CorpusVideoFetcher;
  corpusIndexWriter: CorpusIndexWriter;
}
