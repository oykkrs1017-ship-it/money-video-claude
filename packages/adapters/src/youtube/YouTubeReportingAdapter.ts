/**
 * YouTubeReportingAdapter
 *
 * YouTube Reporting API v1 を使って channel_reach_basic_a1 レポートから
 * サムネイルのインプレッション CTR を取得する。
 *
 * Analytics API v2 では thumbnail CTR が取得できないため、
 * このバルクレポート経由が唯一の手段。
 *
 * 制約:
 *   - ジョブ作成後 24〜48h で初回レポートが生成される（それまでは 0 を返す）
 *   - レポートは日次。前日分以前のデータのみ取得可能
 *   - 既存スコープ yt-analytics.readonly で利用可能
 */

import { google } from 'googleapis';
import type { GoogleOAuth2Client } from './YouTubeAuth';
import { createLogger } from '@money-video/shared-ts';

const REPORT_TYPE_ID = 'channel_reach_basic_a1';
const JOB_NAME = 'money-video-channel-reach';

const logger = createLogger({ name: 'YouTubeReportingAdapter', level: 'info' });

export class YouTubeReportingAdapter {
  private readonly auth: GoogleOAuth2Client;
  private jobIdCache: string | null = null;

  constructor(auth: GoogleOAuth2Client) {
    this.auth = auth;
  }

  /**
   * 直近の channel_reach_basic_a1 レポートから videoId のサムネイル CTR（%）を返す。
   * レポート未生成の場合（ジョブ作成直後）は 0 を返す。
   */
  async fetchThumbnailCtr(videoId: string): Promise<number> {
    const jobId = await this.ensureReachJob();
    const reporting = google.youtubereporting({ version: 'v1', auth: this.auth });

    const reportsRes = await reporting.jobs.reports.list({
      jobId,
      pageSize: 10,
    });

    const reports = reportsRes.data.reports ?? [];
    if (reports.length === 0) {
      logger.info(
        { jobId },
        'Reporting API: レポート未生成（job作成後 24-48h 待機が必要）',
      );
      return 0;
    }

    // レポートは createTime desc でソート済み — 最新から順に検索
    for (const report of reports) {
      if (!report.downloadUrl) continue;
      const csv = await this.downloadReport(report.downloadUrl);
      const ctr = parseCsvForCtr(csv, videoId);
      if (ctr > 0) {
        logger.info(
          { videoId, reportDate: report.startTime, ctr },
          'Reporting API: thumbnail CTR 取得成功',
        );
        return ctr;
      }
    }

    logger.info(
      { videoId, reportsChecked: reports.length },
      'Reporting API: 対象動画のデータなし（公開直後または impressions=0）',
    );
    return 0;
  }

  /**
   * channel_reach_basic_a1 ジョブを作成または既存ジョブを返す。
   * jobId はインスタンス内でキャッシュする。
   */
  async ensureReachJob(): Promise<string> {
    if (this.jobIdCache) return this.jobIdCache;

    const reporting = google.youtubereporting({ version: 'v1', auth: this.auth });

    // 既存ジョブを検索（expireTime なし = 有効なもの）
    const listRes = await reporting.jobs.list();
    const existing = (listRes.data.jobs ?? []).find(
      (j) => j.reportTypeId === REPORT_TYPE_ID && !j.expireTime,
    );

    if (existing?.id) {
      logger.info({ jobId: existing.id }, 'Reporting API: 既存ジョブを再利用');
      this.jobIdCache = existing.id;
      return existing.id;
    }

    // 新規ジョブ作成
    const createRes = await reporting.jobs.create({
      requestBody: { reportTypeId: REPORT_TYPE_ID, name: JOB_NAME },
    });

    const jobId = createRes.data.id ?? '';
    if (!jobId) throw new Error('Reporting API: ジョブ作成に失敗しました');

    this.jobIdCache = jobId;
    logger.info(
      { jobId },
      'Reporting API: channel_reach_basic_a1 ジョブ作成完了（初回レポートは 24-48h 後に生成）',
    );
    return jobId;
  }

  private async downloadReport(downloadUrl: string): Promise<string> {
    // googleapis auth クライアントで認証付きリクエストを送る
    const res = await this.auth.request<string>({
      url: downloadUrl,
      responseType: 'text',
    });
    return res.data;
  }
}

/**
 * channel_reach_basic_a1 CSV を解析して videoId の加重平均 CTR（%）を返す。
 *
 * CSV 列:
 *   date, channel_id, video_id, live_or_on_demand, subscribed_status,
 *   country_code, impressions, impressions_click_through_rate,
 *   views, watch_time_minutes, average_view_percentage, average_view_duration_minutes
 *
 * impressions_click_through_rate は 0〜1 の割合で返される（例: 0.045 = 4.5%）
 * 戻り値は % スケール（0〜100）
 */
function parseCsvForCtr(csv: string, videoId: string): number {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return 0;

  const headers = lines[0].split(',');
  const videoIdIdx = headers.indexOf('video_id');
  const impressionsIdx = headers.indexOf('impressions');
  const ctrIdx = headers.indexOf('impressions_click_through_rate');

  if (videoIdIdx < 0 || impressionsIdx < 0 || ctrIdx < 0) {
    logger.warn({ headers }, 'parseCsvForCtr: 期待した列が見つかりません');
    return 0;
  }

  let totalImpressions = 0;
  let weightedCtrSum = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if ((cols[videoIdIdx] ?? '').trim() !== videoId) continue;

    const impressions = parseFloat(cols[impressionsIdx] ?? '0');
    const ctr = parseFloat(cols[ctrIdx] ?? '0');
    if (!isFinite(impressions) || !isFinite(ctr) || impressions <= 0) continue;

    totalImpressions += impressions;
    weightedCtrSum += impressions * ctr;
  }

  if (totalImpressions <= 0) return 0;

  // 0〜1 の割合 → % に変換
  return (weightedCtrSum / totalImpressions) * 100;
}
