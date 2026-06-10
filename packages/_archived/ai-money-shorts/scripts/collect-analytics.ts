/**
 * collect-analytics.ts
 * YouTube Analytics API からエンゲージメント指標を収集し、
 * brain/scorecards/{episodeId}.json の engagement フィールドを更新する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/collect-analytics.ts [options]
 *
 * オプション:
 *   --ep <episodeId>   特定エピソードのみ収集
 *   --all              全 PENDING エピソードを収集（デフォルト）
 *   --days <n>         収集期間（デフォルト: 7）
 *   --dry-run          スコアカードを書き込まず結果を表示のみ
 *
 * 必要な環境変数 (.env):
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import type { EpisodeScorecard, EngagementMetrics } from '../../../packages/shared/src/scorecard';
import { loadScorecard, saveScorecard } from '../../../packages/shared/src/scorecard';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

// ─── 定数 ────────────────────────────────────────────────────────────────────

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SCORECARDS_DIR = path.join(ROOT_DIR, 'brain', 'scorecards');
const CREDENTIALS_DIR = path.join(__dirname, '..', '.credentials');
const TOKEN_PATH = path.join(CREDENTIALS_DIR, 'youtube-token.json');

// ─── CLI 引数パース ────────────────────────────────────────────────────────

function parseArgs(): {
  episodeId: string | null;
  all: boolean;
  days: number;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let episodeId: string | null = null;
  let all = false;
  let days = 7;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ep' && args[i + 1]) { episodeId = args[i + 1]; i++; }
    if (args[i] === '--all') all = true;
    if (args[i] === '--days' && args[i + 1]) { days = parseInt(args[i + 1], 10); i++; }
    if (args[i] === '--dry-run') dryRun = true;
  }

  if (!episodeId && !all) all = true; // デフォルト: --all
  return { episodeId, all, days, dryRun };
}

// ─── OAuth 認証 ───────────────────────────────────────────────────────────────

function buildOAuth2Client() {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      '環境変数 YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET / YOUTUBE_REFRESH_TOKEN が未設定です'
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost');
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

// ─── YouTube Analytics API ────────────────────────────────────────────────────

interface AnalyticsRow {
  views: number;
  likes: number;
  comments: number;
  estimatedMinutesWatched: number;
  averageViewDuration: number;
  averageViewPercentage: number;
  subscribersGained: number;
  annotationClickThroughRate?: number;
  cardClickRate?: number;
}

async function fetchAnalytics(
  videoId: string,
  days: number,
  auth: ReturnType<typeof buildOAuth2Client>
): Promise<AnalyticsRow | null> {
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  try {
    const res = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      metrics: [
        'views',
        'likes',
        'comments',
        'estimatedMinutesWatched',
        'averageViewDuration',
        'averageViewPercentage',
        'subscribersGained',
        'cardClickRate',
      ].join(','),
      dimensions: 'video',
      filters: `video==${videoId}`,
    });

    const rows = res.data.rows;
    if (!rows || rows.length === 0) return null;

    const row = rows[0] as number[];
    return {
      views: row[1] ?? 0,
      likes: row[2] ?? 0,
      comments: row[3] ?? 0,
      estimatedMinutesWatched: row[4] ?? 0,
      averageViewDuration: row[5] ?? 0,
      averageViewPercentage: row[6] ?? 0,
      subscribersGained: row[7] ?? 0,
      cardClickRate: row[8] ?? 0,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ Analytics 取得エラー (${videoId}): ${message}`);
    return null;
  }
}

// ─── 1日のビュー数を別途取得（24h分） ────────────────────────────────────────

async function fetchViews24h(
  videoId: string,
  auth: ReturnType<typeof buildOAuth2Client>
): Promise<number> {
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth });

  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 1);

  const fmt = (d: Date) => d.toISOString().split('T')[0];

  try {
    const res = await youtubeAnalytics.reports.query({
      ids: 'channel==MINE',
      startDate: fmt(startDate),
      endDate: fmt(endDate),
      metrics: 'views',
      dimensions: 'video',
      filters: `video==${videoId}`,
    });

    const rows = res.data.rows;
    if (!rows || rows.length === 0) return 0;
    return (rows[0] as number[])[1] ?? 0;
  } catch {
    return 0;
  }
}

// ─── スコアカード一覧取得 ─────────────────────────────────────────────────────

function loadAllScorecards(): EpisodeScorecard[] {
  if (!fs.existsSync(SCORECARDS_DIR)) return [];

  const cards: EpisodeScorecard[] = [];
  for (const file of fs.readdirSync(SCORECARDS_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = fs.readFileSync(path.join(SCORECARDS_DIR, file), 'utf8');
      cards.push(JSON.parse(raw) as EpisodeScorecard);
    } catch {
      // 破損ファイルはスキップ
    }
  }
  return cards;
}

// ─── メイン処理 ───────────────────────────────────────────────────────────────

async function collectForEpisode(
  card: EpisodeScorecard,
  days: number,
  auth: ReturnType<typeof buildOAuth2Client>,
  dryRun: boolean
): Promise<boolean> {
  if (!card.videoId) {
    console.log(`  ⚠ ${card.episodeId}: videoId 未設定、スキップ`);
    return false;
  }

  console.log(`  🔍 ${card.episodeId} (${card.videoId}) を収集中...`);

  const [analytics, views24h] = await Promise.all([
    fetchAnalytics(card.videoId, days, auth),
    fetchViews24h(card.videoId, auth),
  ]);

  if (!analytics) {
    console.log(`  ⚠ ${card.episodeId}: データなし（動画が非公開または削除済み？）`);
    return false;
  }

  const engagement: EngagementMetrics = {
    collectedAt: new Date().toISOString(),
    views24h,
    views7d: analytics.views,
    likes7d: analytics.likes,
    comments7d: analytics.comments,
    avgViewDurationSec: analytics.averageViewDuration,
    retentionRate: analytics.averageViewPercentage,
    ctr: analytics.cardClickRate !== undefined ? analytics.cardClickRate * 100 : undefined,
    subscriberDelta7d: analytics.subscribersGained,
  };

  console.log(
    `  ✓ ${card.episodeId}: views7d=${analytics.views}, retention=${analytics.averageViewPercentage.toFixed(1)}%, ctr=${(engagement.ctr ?? 0).toFixed(2)}%`
  );

  if (!dryRun) {
    const updated: EpisodeScorecard = { ...card, engagement };
    saveScorecard(ROOT_DIR, updated);
    console.log(`  💾 ${card.episodeId}: スコアカードを更新しました`);
  } else {
    console.log(`  [dry-run] ${card.episodeId}: 書き込みをスキップ`);
  }

  return true;
}

async function main(): Promise<void> {
  const { episodeId, all, days, dryRun } = parseArgs();

  console.log('📊 YouTube Analytics 収集開始');
  if (dryRun) console.log('  [dry-run モード: スコアカードは更新しません]');

  const auth = buildOAuth2Client();

  let targets: EpisodeScorecard[] = [];

  if (episodeId) {
    const card = loadScorecard(ROOT_DIR, episodeId);
    if (!card) {
      console.error(`✗ スコアカードが見つかりません: ${episodeId}`);
      process.exit(1);
    }
    targets = [card];
  } else if (all) {
    const allCards = loadAllScorecards().filter(
      (c) => c.channel === 'ai-money-shorts' && c.videoId
    );
    targets = allCards;
    console.log(`  対象: ${targets.length} 件`);
  }

  if (targets.length === 0) {
    console.log('  収集対象がありません（videoId が設定されたスコアカードがない）');
    return;
  }

  let successCount = 0;
  for (const card of targets) {
    const ok = await collectForEpisode(card, days, auth, dryRun);
    if (ok) successCount++;
  }

  console.log(`\n✅ 収集完了: ${successCount}/${targets.length} 件`);
}

main().catch((err: unknown) => {
  console.error('✗ エラー:', err instanceof Error ? err.message : err);
  process.exit(1);
});
