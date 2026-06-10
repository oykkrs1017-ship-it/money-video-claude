/**
 * scripts/analyze-my-channel.ts
 * 自チャンネルの動画パフォーマンスを取得し、Claudeで勝ちパターンを分析する
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/analyze-my-channel.ts
 *   npx ts-node --transpile-only scripts/analyze-my-channel.ts --days 90  # 集計期間(デフォルト30日)
 *   npx ts-node --transpile-only scripts/analyze-my-channel.ts --output report.json
 */

import fs from 'fs';
import path from 'path';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// ─── .env 読み込み（packages/.env を優先）────────────────────────────────────
const envCandidates = [
  path.join(__dirname, '..', '..', '.env'),   // packages/.env
  path.join(__dirname, '..', '.env'),          // packages/tech-geopolitics-channel/.env
  path.join(__dirname, '..', '..', '..', '.env'), // root .env
];
for (const p of envCandidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    console.log(`   .env 読み込み: ${p}`);
    break;
  }
}

// ─── CLI 引数 ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const daysArg = args.includes('--days') ? parseInt(args[args.indexOf('--days') + 1] ?? '30') : 30;
const outputArg = args.includes('--output') ? args[args.indexOf('--output') + 1] : null;

// ─── OAuth2 クライアント構築 ──────────────────────────────────────────────────
function buildOAuth2Client(): OAuth2Client {
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ 環境変数が不足しています:');
    if (!clientId) console.error('   YOUTUBE_CLIENT_ID が未設定');
    if (!clientSecret) console.error('   YOUTUBE_CLIENT_SECRET が未設定');
    if (!refreshToken) console.error('   YOUTUBE_REFRESH_TOKEN が未設定');
    console.error('\n💡 yt-analytics.readonly スコープが必要です。未取得の場合:');
    console.error('   npx ts-node --transpile-only scripts/youtube-reauth.ts');
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob');
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

// ─── 型定義 ───────────────────────────────────────────────────────────────────
interface VideoInfo {
  id: string;
  title: string;
  publishedAt: string;
  description: string;
  tags: string[];
  duration: string;
  views: number;
  likes: number;
  comments: number;
  likeRate: number;
  commentRate: number;
}

/** 動画内の何%時点で何%が視聴中かを示す1点 */
interface RetentionPoint {
  timeRatio: number;   // 0.0〜1.0 (動画の何%時点か)
  watchRatio: number;  // 0.0〜1.0 (まだ視聴中の割合)
}

/** 流入経路ごとの再生数 */
interface TrafficSource {
  sourceType: string;  // RELATED_VIDEO / YT_SEARCH / BROWSE_FEATURES / EXTERNAL / NOTIFICATION / NO_LINK_OTHER / etc.
  views: number;
  percentage: number;
}

interface VideoAnalytics {
  videoId: string;
  title: string;
  avgViewDurationSec: number;
  retentionRate: number;
  ctr: number;
  impressions: number;
  views: number;
  retentionCurve: RetentionPoint[];
}

// ─── チャンネルID取得 ─────────────────────────────────────────────────────────
async function fetchChannelId(auth: OAuth2Client): Promise<string> {
  const youtube = google.youtube({ version: 'v3', auth });
  const res = await youtube.channels.list({ part: ['id', 'snippet'], mine: true });
  const channel = res.data.items?.[0];
  if (!channel?.id) throw new Error('チャンネルが見つかりません');
  console.log(`📺 チャンネル: ${channel.snippet?.title} (${channel.id})`);
  return channel.id;
}

// ─── 動画一覧取得 ─────────────────────────────────────────────────────────────
async function fetchAllVideos(auth: OAuth2Client, channelId: string): Promise<VideoInfo[]> {
  const youtube = google.youtube({ version: 'v3', auth });
  const videoIds: string[] = [];
  let pageToken: string | undefined;

  do {
    const res = await youtube.search.list({
      part: ['id'],
      channelId,
      type: ['video'],
      maxResults: 50,
      pageToken,
      order: 'date',
    });
    for (const item of res.data.items ?? []) {
      if (item.id?.videoId) videoIds.push(item.id.videoId);
    }
    pageToken = res.data.nextPageToken ?? undefined;
  } while (pageToken);

  if (videoIds.length === 0) return [];
  console.log(`🎬 動画数: ${videoIds.length}件`);

  const videos: VideoInfo[] = [];
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const res = await youtube.videos.list({
      part: ['snippet', 'statistics', 'contentDetails'],
      id: chunk,
    });
    for (const item of res.data.items ?? []) {
      const stats = item.statistics ?? {};
      const views = parseInt(stats.viewCount ?? '0');
      const likes = parseInt(stats.likeCount ?? '0');
      const comments = parseInt(stats.commentCount ?? '0');
      videos.push({
        id: item.id ?? '',
        title: item.snippet?.title ?? '',
        publishedAt: item.snippet?.publishedAt ?? '',
        description: (item.snippet?.description ?? '').slice(0, 200),
        tags: item.snippet?.tags ?? [],
        duration: item.contentDetails?.duration ?? '',
        views,
        likes,
        comments,
        likeRate: views > 0 ? (likes / views) * 100 : 0,
        commentRate: views > 0 ? (comments / views) * 100 : 0,
      });
    }
  }

  return videos.sort((a, b) => b.views - a.views);
}

// ─── リテンションカーブ取得 ──────────────────────────────────────────────────
// 動画内の「何%時点で何%の視聴者がまだ見ているか」を返す。
// audienceWatchRatio が取得できない動画（投稿直後や再生数が少ない）は空配列を返す。
async function fetchRetentionCurve(
  auth: OAuth2Client,
  channelId: string,
  videoId: string,
  startDate: string,
  endDate: string,
): Promise<RetentionPoint[]> {
  try {
    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth });
    const res = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'audienceWatchRatio',
      dimensions: 'elapsedVideoTimeRatio',
      filters: `video==${videoId}`,
      sort: 'elapsedVideoTimeRatio',
    });

    return (res.data.rows ?? []).map(row => ({
      timeRatio: typeof row[0] === 'number' ? row[0] : parseFloat(String(row[0] ?? '0')),
      watchRatio: typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1] ?? '0')),
    }));
  } catch {
    return [];
  }
}

// ─── 流入経路取得（チャンネル全体） ─────────────────────────────────────────
async function fetchTrafficSources(
  auth: OAuth2Client,
  channelId: string,
  startDate: string,
  endDate: string,
): Promise<TrafficSource[]> {
  try {
    const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth });
    const res = await youtubeAnalytics.reports.query({
      ids: `channel==${channelId}`,
      startDate,
      endDate,
      metrics: 'views',
      dimensions: 'insightTrafficSourceType',
      sort: '-views',
    });

    const rows = res.data.rows ?? [];
    const totalViews = rows.reduce((sum, row) => {
      const v = typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1] ?? '0'));
      return sum + v;
    }, 0);

    return rows.map(row => {
      const views = typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1] ?? '0'));
      return {
        sourceType: String(row[0] ?? 'UNKNOWN'),
        views,
        percentage: totalViews > 0 ? (views / totalViews) * 100 : 0,
      };
    });
  } catch (e) {
    console.warn(`⚠️  流入経路取得スキップ: ${(e as Error).message}`);
    return [];
  }
}

// ─── Analytics データ取得 ──────────────────────────────────────────────────────
async function fetchAnalyticsForVideos(
  auth: OAuth2Client,
  channelId: string,
  videoIds: string[],
  days: number
): Promise<VideoAnalytics[]> {
  const youtubeAnalytics = google.youtubeAnalytics({ version: 'v2', auth });
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const results: VideoAnalytics[] = [];

  // レート制限対策: 上位10件のみリテンションカーブを取得
  const limit = Math.min(videoIds.length, 10);

  for (let i = 0; i < limit; i++) {
    const videoId = videoIds[i]!;
    try {
      // impressions / impressionClickThroughRate は dimensions:'video' と共存不可
      // → views/avgViewDuration/retentionRate は video dimension で、CTR/impressions は別クエリで取得
      const res = await youtubeAnalytics.reports.query({
        ids: `channel==${channelId}`,
        startDate,
        endDate,
        metrics: 'views,averageViewDuration,averageViewPercentage',
        dimensions: 'video',
        filters: `video==${videoId}`,
      });

      const row = res.data.rows?.[0];
      if (!row) continue;

      // CTR・インプレッション: dimensions なし + filters のみで取得
      let impressions = 0;
      let ctr = 0;
      try {
        const impRes = await youtubeAnalytics.reports.query({
          ids: `channel==${channelId}`,
          startDate,
          endDate,
          metrics: 'impressions,impressionClickThroughRate',
          filters: `video==${videoId}`,
        });
        const impRow = impRes.data.rows?.[0];
        if (impRow) {
          impressions = typeof impRow[0] === 'number' ? impRow[0] : parseFloat(String(impRow[0] ?? '0'));
          ctr = (typeof impRow[1] === 'number' ? impRow[1] : parseFloat(String(impRow[1] ?? '0'))) * 100;
        }
      } catch {
        // 取得できなくても続行
      }

      // リテンションカーブ取得（300ms間隔でレート制限回避）
      await new Promise(r => setTimeout(r, 300));
      const retentionCurve = await fetchRetentionCurve(auth, channelId, videoId, startDate, endDate);

      results.push({
        videoId,
        title: '',
        views: typeof row[1] === 'number' ? row[1] : parseFloat(String(row[1] ?? '0')),
        avgViewDurationSec: typeof row[2] === 'number' ? row[2] : parseFloat(String(row[2] ?? '0')),
        retentionRate: typeof row[3] === 'number' ? row[3] : parseFloat(String(row[3] ?? '0')),
        impressions,
        ctr,
        retentionCurve,
      });
    } catch (e) {
      console.warn(`⚠️  Analytics取得スキップ (${videoId}): ${(e as Error).message}`);
    }
  }

  return results;
}

// ─── リテンションカーブを要約テキストに変換 ──────────────────────────────────
function summarizeRetentionCurve(curve: RetentionPoint[]): string {
  if (curve.length === 0) return '(データなし)';

  // 10%刻みでサンプリング
  const checkpoints = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  const summary = checkpoints.map(pct => {
    const ratio = pct / 100;
    const closest = curve.reduce((prev, curr) =>
      Math.abs(curr.timeRatio - ratio) < Math.abs(prev.timeRatio - ratio) ? curr : prev
    );
    return `${pct}%: ${(closest.watchRatio * 100).toFixed(0)}%`;
  });

  // 最大離脱ポイントを特定（隣接点間の差分が最大の箇所）
  let maxDrop = 0;
  let maxDropAt = 0;
  for (let i = 1; i < curve.length; i++) {
    const drop = (curve[i - 1]!.watchRatio - curve[i]!.watchRatio);
    if (drop > maxDrop) {
      maxDrop = drop;
      maxDropAt = Math.round(curve[i]!.timeRatio * 100);
    }
  }

  return `[${summary.join(' / ')}] ★最大離脱: ${maxDropAt}%地点 (${(maxDrop * 100).toFixed(1)}%ポイント減)`;
}

// ─── 流入経路を表示名に変換 ──────────────────────────────────────────────────
const TRAFFIC_SOURCE_LABELS: Record<string, string> = {
  RELATED_VIDEO: 'サジェスト（関連動画）',
  YT_SEARCH: 'YouTube検索',
  BROWSE_FEATURES: 'ブラウズ（ホーム/急上昇）',
  NOTIFICATION: '通知',
  EXTERNAL: '外部サイト',
  NO_LINK_OTHER: 'リンクなし（直接）',
  PLAYLIST: 'プレイリスト',
  YT_CHANNEL: 'チャンネルページ',
  END_SCREEN: '終了画面',
  CARDS: 'カード',
  SHORTS: 'Shorts',
  UNKNOWN: 'その他',
};

function labelTrafficSource(sourceType: string): string {
  return TRAFFIC_SOURCE_LABELS[sourceType] ?? sourceType;
}

// ─── Claude で分析 ────────────────────────────────────────────────────────────
async function analyzeWithClaude(
  videos: VideoInfo[],
  analyticsMap: Map<string, VideoAnalytics>,
  trafficSources: TrafficSource[],
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY が未設定');

  const client = new Anthropic({ apiKey });

  const topVideos = videos.slice(0, Math.min(10, videos.length));
  const bottomVideos = videos.slice(-Math.min(5, videos.length));

  const videoSummary = topVideos.map((v, i) => {
    const a = analyticsMap.get(v.id);
    const retentionSummary = a && a.retentionCurve.length > 0
      ? `\n   リテンションカーブ: ${summarizeRetentionCurve(a.retentionCurve)}`
      : '';
    return [
      `${i + 1}. 「${v.title}」(${v.id})`,
      `   再生数: ${v.views.toLocaleString()} | いいね率: ${v.likeRate.toFixed(2)}% | コメント率: ${v.commentRate.toFixed(2)}%`,
      a ? `   視聴維持率: ${a.retentionRate.toFixed(1)}% | CTR: ${a.ctr.toFixed(2)}% | 平均視聴時間: ${Math.round(a.avgViewDurationSec)}秒 | インプレ: ${a.impressions.toLocaleString()}` : '',
      retentionSummary,
      `   タグ: ${v.tags.slice(0, 5).join(', ')}`,
    ].filter(Boolean).join('\n');
  }).join('\n\n');

  const bottomSummary = bottomVideos.map((v, i) => (
    `${i + 1}. 「${v.title}」 (再生数: ${v.views.toLocaleString()})`
  )).join('\n');

  const trafficSummary = trafficSources.length > 0
    ? trafficSources.map(s =>
        `- ${labelTrafficSource(s.sourceType)}: ${s.views.toLocaleString()}回 (${s.percentage.toFixed(1)}%)`
      ).join('\n')
    : '(データなし)';

  const prompt = `
あなたはYouTubeチャンネル成長の専門家です。
以下のチャンネルデータを分析し、「なぜこの動画が伸びたか」「どこで視聴者が離脱するか」「次に何をすべきか」を具体的に教えてください。

## チャンネル全体統計
- 総動画数: ${videos.length}件
- 平均再生数: ${Math.round(videos.reduce((s, v) => s + v.views, 0) / videos.length).toLocaleString()}
- 最高再生数: ${videos[0]?.views.toLocaleString()} 「${videos[0]?.title}」
- 平均いいね率: ${(videos.reduce((s, v) => s + v.likeRate, 0) / videos.length).toFixed(2)}%

## 流入経路内訳（チャンネル全体）
${trafficSummary}

## 再生数TOP${topVideos.length}（リテンションカーブ付き）
リテンションカーブの読み方: 「10%: 72%」= 動画の10%時点でまだ72%が視聴中。★最大離脱はその動画で最も視聴者が一度に抜ける箇所。

${videoSummary}

## 低パフォーマンス動画（参考）
${bottomSummary}

## 分析してほしいこと
1. **勝ちパターン**: 高再生動画に共通するタイトル・タグ・テーマの特徴
2. **視聴維持率分析**: CTRと視聴維持率から読み取れる改善点（高CTR・低維持率なら「釣り」、低CTR・高維持率なら「サムネ問題」など）
3. **次の一手**: 今すぐ実行すべき具体的な施策（3つ）
4. **避けるべきパターン**: 低パフォーマンス動画から見えるNG要素
5. **離脱ポイント分析**: リテンションカーブで「★最大離脱」の箇所がある動画について、そのタイムスタンプで何が起きているか仮説を立てて（イントロが長い？テーマ変化？クライマックス後？）
6. **流入経路の問題**: 流入がどの経路に依存しているか。サジェスト依存なら「アルゴリズムの奴隷」状態でいつ落ちても不思議でない、検索依存なら「タグ最適化が重要」など成長限界の要因を特定して
7. **ファネル最大ボトルネック**: インプレッション→CTR→視聴維持率→いいね の各段階で一番損失が大きい箇所を1つ特定して、具体的な改善方法を教えて

日本語で、具体的かつ実用的なアドバイスをお願いします。
`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : '';
}

// ─── メイン ───────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n📊 自チャンネル分析開始');
  console.log(`   集計期間: 過去${daysArg}日間`);
  console.log('   💡 yt-analytics.readonly スコープが必要です。認証エラーが出たら youtube-reauth.ts を実行してください\n');

  const auth = buildOAuth2Client();

  // 1. チャンネルID取得
  const channelId = await fetchChannelId(auth);

  // 2. 動画一覧取得
  console.log('\n🎬 動画一覧取得中...');
  const videos = await fetchAllVideos(auth, channelId);

  if (videos.length === 0) {
    console.log('ℹ️  動画が見つかりませんでした');
    return;
  }

  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = new Date(Date.now() - daysArg * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // 3. Analytics + リテンションカーブ取得（上位10件）
  console.log(`\n📈 Analytics取得中（上位${Math.min(10, videos.length)}件、リテンションカーブ含む）...`);
  const topVideoIds = videos.slice(0, 10).map(v => v.id);
  const analyticsData = await fetchAnalyticsForVideos(auth, channelId, topVideoIds, daysArg);
  const analyticsMap = new Map(analyticsData.map(a => [a.videoId, a]));
  console.log(`   取得完了: ${analyticsData.length}件`);

  // 4. 流入経路取得（チャンネル全体）
  console.log('\n🔍 流入経路取得中...');
  const trafficSources = await fetchTrafficSources(auth, channelId, startDate, endDate);
  console.log(`   取得完了: ${trafficSources.length}経路`);

  // 5. Claude分析（失敗しても生データは保存する）
  console.log('\n🤖 Claude分析中...');
  let analysis: string;
  try {
    analysis = await analyzeWithClaude(videos, analyticsMap, trafficSources);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`   ⚠️ Claude分析スキップ: ${msg}（YouTube生データのみ保存します）`);
    analysis = `SKIPPED: ${msg}`;
  }

  // 6. 結果表示
  console.log('\n' + '='.repeat(60));
  console.log('📋 分析レポート');
  console.log('='.repeat(60));
  console.log(analysis);

  // 7. JSON保存
  const reportData = {
    generatedAt: new Date().toISOString(),
    channelId,
    totalVideos: videos.length,
    analysisPeriodDays: daysArg,
    trafficSources,
    videos: videos.map(v => ({
      ...v,
      analytics: analyticsMap.get(v.id) ?? null,
    })),
    claudeAnalysis: analysis,
  };

  const outputPath = outputArg
    ? path.resolve(outputArg)
    : path.join(__dirname, '..', 'output', 'channel-analysis.json');

  fs.writeFileSync(outputPath, JSON.stringify(reportData, null, 2), 'utf8');
  console.log(`\n💾 レポート保存: ${outputPath}`);
  console.log('\n✅ 分析完了');
})().catch(err => {
  console.error('❌ エラー:', err.message ?? err);
  if ((err as Error).message?.includes('insufficientPermissions') || (err as Error).message?.includes('forbidden')) {
    console.error('\n💡 yt-analytics.readonly スコープが必要です。以下を実行してトークンを再取得してください:');
    console.error('   npx ts-node --transpile-only scripts/youtube-reauth.ts');
  }
  process.exit(1);
});
