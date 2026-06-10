/**
 * scripts/update-analytics-log.ts
 *
 * YouTube Analytics から最新の KPI を収集し、
 * `tasks/analytics-log.md` を Markdown テーブルで上書きする。
 *
 * 処理フロー:
 *   1. OAuth2 認証（既存トークン再利用、なければ upload-youtube.ts を先に走らせる）
 *   2. AnalyzePerformanceUseCase で PENDING かつ videoId 付きのスコアカード全件を更新
 *   3. brain/scorecards/*.json を読み込み、engagement 付きを時系列順に並べる
 *   4. tasks/analytics-log.md を生成して書き出し
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/update-analytics-log.ts
 *   npx ts-node --transpile-only scripts/update-analytics-log.ts --skip-fetch  # API 叩かずログだけ再生成
 *
 * 前提:
 *   - upload-youtube.ts で scorecard に videoId が書き込まれていること
 *   - .credentials/youtube-token.json が有効であること
 */

import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import type { GoogleOAuth2Client } from '../../../packages/adapters/src/youtube/YouTubeAuth';
import { AnalyzePerformanceUseCase } from '../../../packages/usecases/src/analyzePerformance/AnalyzePerformanceUseCase';
import { YouTubeAnalyticsAdapter } from '../../../packages/adapters/src/youtube/YouTubeAnalyticsAdapter';
import { ScorecardManager } from '../../../packages/adapters/src/brain/ScorecardManager';
import { ResultsTsvUpdater } from '../../../packages/adapters/src/brain/ResultsTsvUpdater';

// ─── 定数 ────────────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const SCORECARDS_DIR = path.join(ROOT_DIR, 'brain', 'scorecards');
const ANALYTICS_LOG_PATH = path.join(ROOT_DIR, 'tasks', 'analytics-log.md');
const CREDENTIALS_DIR = path.join(__dirname, '..', '.credentials');
const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CREDENTIALS_DIR, 'youtube-token.json');

// KPI 目標値（3ヶ月後目標 / tasks/lessons.md 基準）
const TARGET_CTR = 7.0;         // %
const TARGET_RETENTION = 60.0;  // %
const TARGET_AVG_VIEW = 6 * 60; // sec

interface ScorecardFull {
  episodeId: string;
  channel: string;
  recordedAt: string;
  videoId?: string;
  verdict: string;
  engagement?: {
    collectedAt: string;
    views7d: number;
    likes7d: number;
    comments7d: number;
    avgViewDurationSec: number;
    retentionRate: number;
    ctr: number;
  };
  [key: string]: unknown;
}

// ─── CLI 引数解析 ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const skipFetch = args.includes('--skip-fetch');

// ─── OAuth2 認証 ─────────────────────────────────────────────────────────────
async function authorize(): Promise<GoogleOAuth2Client> {
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    throw new Error(`認証ファイルが見つかりません: ${CLIENT_SECRET_PATH}`);
  }
  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf8')) as Record<
    string,
    Record<string, string>
  >;
  const { client_id, client_secret } = raw.installed ?? raw.web ?? {};
  const oauth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    'urn:ietf:wg:oauth:2.0:oob',
  );

  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error(
      'YouTube トークンが見つかりません。先に upload-youtube.ts を実行してください。',
    );
  }

  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')) as {
    expiry_date?: number;
    [key: string]: unknown;
  };
  oauth2Client.setCredentials(token);

  if (token.expiry_date && token.expiry_date < Date.now()) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials, null, 2), 'utf8');
  }

  return oauth2Client;
}

// ─── スコアカード読み込み ────────────────────────────────────────────────────
function loadAllScorecards(): ScorecardFull[] {
  if (!fs.existsSync(SCORECARDS_DIR)) return [];
  return fs
    .readdirSync(SCORECARDS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(
          fs.readFileSync(path.join(SCORECARDS_DIR, f), 'utf8'),
        ) as ScorecardFull;
      } catch {
        return null;
      }
    })
    .filter((s): s is ScorecardFull => s !== null);
}

// ─── Markdown 生成 ───────────────────────────────────────────────────────────
function fmtNum(n: number | undefined, digits = 1): string {
  if (n === undefined || Number.isNaN(n)) return '-';
  return n.toFixed(digits);
}

function fmtDuration(sec: number | undefined): string {
  if (sec === undefined || Number.isNaN(sec) || sec === 0) return '-';
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}m${String(s).padStart(2, '0')}s`;
}

function verdictIcon(verdict: string): string {
  switch (verdict) {
    case 'KEEP':
      return '✅';
    case 'DISCARD':
      return '❌';
    case 'PENDING':
      return '⏳';
    default:
      return '❓';
  }
}

function kpiStatus(
  ctr: number | undefined,
  retention: number | undefined,
  avgView: number | undefined,
): string {
  const hits: string[] = [];
  if (ctr !== undefined && ctr >= TARGET_CTR) hits.push('CTR');
  if (retention !== undefined && retention >= TARGET_RETENTION) hits.push('維持率');
  if (avgView !== undefined && avgView >= TARGET_AVG_VIEW) hits.push('視聴時間');
  if (hits.length === 0) return '—';
  return hits.join('/') + ' 達成';
}

function buildMarkdown(scorecards: ScorecardFull[]): string {
  const sorted = [...scorecards].sort((a, b) => {
    // 新しい順（recordedAt desc）
    return (b.recordedAt ?? '').localeCompare(a.recordedAt ?? '');
  });

  const generatedAt = new Date().toISOString();
  const lines: string[] = [];

  lines.push('# YouTube Analytics ログ（自動生成）');
  lines.push('');
  lines.push(`> 最終更新: ${generatedAt}`);
  lines.push('> 生成元: `scripts/update-analytics-log.ts`');
  lines.push('');
  lines.push('## KPI 目標（3ヶ月後）');
  lines.push('');
  lines.push(`- CTR: **${TARGET_CTR}%** 以上`);
  lines.push(`- 平均視聴維持率: **${TARGET_RETENTION}%** 以上`);
  lines.push(`- 平均視聴時間: **${fmtDuration(TARGET_AVG_VIEW)}** 以上`);
  lines.push('');

  // ─── エピソード別テーブル ─────────────────────────────────────
  lines.push('## エピソード別 KPI');
  lines.push('');
  lines.push(
    '| 状態 | エピソード | videoId | 再生数 | いいね | コメント | CTR(%) | 維持率(%) | 平均視聴 | KPI達成 | 収集日時 |',
  );
  lines.push(
    '|:---:|:---|:---|---:|---:|---:|---:|---:|---:|:---|:---|',
  );

  for (const s of sorted) {
    if (!s.videoId) continue; // 未公開はスキップ
    const e = s.engagement;
    const url = `https://www.youtube.com/watch?v=${s.videoId}`;
    lines.push(
      [
        verdictIcon(s.verdict),
        s.episodeId,
        `[${s.videoId}](${url})`,
        e ? e.views7d.toLocaleString() : '-',
        e ? e.likes7d.toLocaleString() : '-',
        e ? e.comments7d.toLocaleString() : '-',
        e ? fmtNum(e.ctr, 2) : '-',
        e ? fmtNum(e.retentionRate, 1) : '-',
        e ? fmtDuration(e.avgViewDurationSec) : '-',
        e ? kpiStatus(e.ctr, e.retentionRate, e.avgViewDurationSec) : '未収集',
        e ? e.collectedAt.slice(0, 16).replace('T', ' ') : '-',
      ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'),
    );
  }

  lines.push('');

  // ─── サマリ（平均値）────────────────────────────────────────
  const withEng = sorted.filter((s): s is ScorecardFull & { engagement: NonNullable<ScorecardFull['engagement']> } => !!s.engagement);
  if (withEng.length > 0) {
    const avg = (pick: (e: ScorecardFull['engagement']) => number): number => {
      const vals = withEng.map((s) => pick(s.engagement)).filter((v) => !Number.isNaN(v));
      if (vals.length === 0) return 0;
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    };

    lines.push('## 集計（収集済み ' + withEng.length + ' 本の平均）');
    lines.push('');
    lines.push(`- 平均 CTR: **${fmtNum(avg((e) => e!.ctr), 2)}%** (目標 ${TARGET_CTR}%)`);
    lines.push(
      `- 平均 視聴維持率: **${fmtNum(avg((e) => e!.retentionRate), 1)}%** (目標 ${TARGET_RETENTION}%)`,
    );
    lines.push(
      `- 平均 視聴時間: **${fmtDuration(avg((e) => e!.avgViewDurationSec))}** (目標 ${fmtDuration(TARGET_AVG_VIEW)})`,
    );
    lines.push(`- 平均 再生数: **${Math.round(avg((e) => e!.views7d)).toLocaleString()}**`);
    lines.push('');
  }

  lines.push('## メモ');
  lines.push('');
  lines.push('- このファイルは `scripts/update-analytics-log.ts` により上書きされる。手動編集は `## メモ` セクション以降も保持されない。');
  lines.push('- 新エピソードをアップロード → しばらく待ってから本スクリプトを再実行すると engagement が埋まる。');
  lines.push('- `--skip-fetch` フラグで API を叩かずローカルの scorecards だけから再生成できる。');
  lines.push('');

  return lines.join('\n');
}

// ─── エントリポイント ────────────────────────────────────────────────────────
(async () => {
  try {
    if (!skipFetch) {
      const auth = await authorize();
      const useCase = new AnalyzePerformanceUseCase({
        scorecardRepository: new ScorecardManager(ROOT_DIR),
        analyticsClient: new YouTubeAnalyticsAdapter(auth),
        tsvUpdater: new ResultsTsvUpdater(ROOT_DIR),
      });
      const result = await useCase.execute({ allPending: true });
      process.stdout.write(
        `✅ Analytics 収集: 処理 ${result.processedCount} / スキップ ${result.skippedCount} / エラー ${result.errorCount}\n`,
      );
    } else {
      process.stdout.write('⏭️  --skip-fetch 指定のため API 取得をスキップ\n');
    }

    const scorecards = loadAllScorecards();
    const md = buildMarkdown(scorecards);

    fs.mkdirSync(path.dirname(ANALYTICS_LOG_PATH), { recursive: true });
    fs.writeFileSync(ANALYTICS_LOG_PATH, md, 'utf8');
    process.stdout.write(`✅ ${path.relative(ROOT_DIR, ANALYTICS_LOG_PATH)} を更新しました (${scorecards.length} scorecards)\n`);
  } catch (err) {
    process.stderr.write(`❌ エラー: ${(err as Error).message}\n`);
    process.exit(1);
  }
})();
