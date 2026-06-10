/**
 * YouTubeAnalyticsAdapter
 *
 * YouTube Data API v3 + YouTube Analytics API v2 を使って
 * 動画のエンゲージメント指標を取得する。
 * VideoAnalyticsClient ポートを実装。
 */

import { google } from 'googleapis';
import type { GoogleOAuth2Client } from './YouTubeAuth';
import { YouTubeReportingAdapter } from './YouTubeReportingAdapter';
import { createLogger } from '@money-video/shared-ts';

const logger = createLogger({ name: 'YouTubeAnalyticsAdapter', level: 'info' });

/** VideoAnalyticsClient port と shape 互換 */
export interface VideoAnalyticsClient {
  fetchVideoStats(videoId: string): Promise<{ views: number; likes: number; comments: number }>;
  fetchRetentionMetrics(videoId: string): Promise<{ avgViewDurationSec: number; retentionRate: number }>;
  fetchCtr(videoId: string): Promise<number>;
}

export class YouTubeAnalyticsAdapter implements VideoAnalyticsClient {
  private readonly auth: GoogleOAuth2Client;
  private readonly reportingAdapter: YouTubeReportingAdapter;
  private channelIdCache: string | null = null;

  constructor(auth: GoogleOAuth2Client) {
    this.auth = auth;
    this.reportingAdapter = new YouTubeReportingAdapter(auth);
  }

  async fetchVideoStats(
    videoId: string,
  ): Promise<{ views: number; likes: number; comments: number }> {
    const youtube = google.youtube({ version: 'v3', auth: this.auth });
    const res = await youtube.videos.list({
      part: ['statistics'],
      id: [videoId],
    });
    const stats = res.data.items?.[0]?.statistics;
    return {
      views: parseInt(stats?.viewCount ?? '0', 10),
      likes: parseInt(stats?.likeCount ?? '0', 10),
      comments: parseInt(stats?.commentCount ?? '0', 10),
    };
  }

  async fetchRetentionMetrics(
    videoId: string,
  ): Promise<{ avgViewDurationSec: number; retentionRate: number }> {
    try {
      const channelId = await this.getChannelId();
      const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: this.auth });
      const { startDate, endDate } = dateRange30d();

      const res = await youtubeAnalytics.reports.query({
        ids: `channel==${channelId}`,
        startDate,
        endDate,
        metrics: 'averageViewDuration,averageViewPercentage',
        dimensions: 'video',
        filters: `video==${videoId}`,
      });

      const row = res.data.rows?.[0];
      if (!row) return { avgViewDurationSec: 0, retentionRate: 0 };

      return {
        avgViewDurationSec: parseFloat(String(row[1] ?? '0')),
        retentionRate: parseFloat(String(row[2] ?? '0')),
      };
    } catch (err) {
      // Analytics API はチャンネル開設直後に取得できない場合がある
      logger.warn(
        { videoId, err: (err as Error).message },
        'fetchRetentionMetrics: Analytics API 取得スキップ',
      );
      return { avgViewDurationSec: 0, retentionRate: 0 };
    }
  }

  /**
   * サムネイルのインプレッション CTR（%）を返す。
   *
   * Reporting API v1 (channel_reach_basic_a1) を優先使用。
   * レポート未生成（job 作成後 24-48h）の場合は annotationClickThroughRate で代替。
   */
  async fetchCtr(videoId: string): Promise<number> {
    // Reporting API v1 でサムネイル CTR を取得（本命）
    try {
      const thumbnailCtr = await this.reportingAdapter.fetchThumbnailCtr(videoId);
      if (thumbnailCtr > 0) return thumbnailCtr;
    } catch (err) {
      logger.warn(
        { videoId, err: (err as Error).message },
        'fetchCtr: Reporting API スキップ → annotation CTR にフォールバック',
      );
    }

    // Reporting API にデータがない間は annotationClickThroughRate で代替
    try {
      const channelId = await this.getChannelId();
      const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth: this.auth });
      const { startDate, endDate } = dateRange30d();

      const res = await youtubeAnalytics.reports.query({
        ids: `channel==${channelId}`,
        startDate,
        endDate,
        metrics: 'annotationClickThroughRate',
        dimensions: 'video',
        filters: `video==${videoId}`,
      });

      const row = res.data.rows?.[0];
      return row ? parseFloat(String(row[1] ?? '0')) * 100 : 0;
    } catch (err) {
      logger.warn(
        { videoId, err: (err as Error).message },
        'fetchCtr: Analytics API フォールバックもスキップ',
      );
      return 0;
    }
  }

  private async getChannelId(): Promise<string> {
    if (this.channelIdCache) return this.channelIdCache;
    const youtube = google.youtube({ version: 'v3', auth: this.auth });
    const res = await youtube.channels.list({ part: ['id'], mine: true });
    const id = res.data.items?.[0]?.id ?? '';
    this.channelIdCache = id;
    return id;
  }
}

function dateRange30d(): { startDate: string; endDate: string } {
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return { startDate, endDate };
}
