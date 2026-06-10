/**
 * scripts/collect-analytics.ts — thin shim
 *
 * 実際のロジックは AnalyzePerformanceUseCase に委譲。
 * このファイルは: CLI 引数解析 → OAuth2 認証 → DI ワイヤリング → usecase.execute() のみ。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/collect-analytics.ts --ep ep005
 *   npx ts-node --transpile-only scripts/collect-analytics.ts --all
 *
 * 前提: upload-youtube.ts によって scorecard に videoId が記録済みであること
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
const CREDENTIALS_DIR = path.join(__dirname, '..', '.credentials');
const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CREDENTIALS_DIR, 'youtube-token.json');

// ─── CLI 引数解析 ─────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const epIdArg = args.includes('--ep') ? args[args.indexOf('--ep') + 1] : undefined;
const allMode = args.includes('--all');

if (!epIdArg && !allMode) {
  console.error('使い方: npx ts-node --transpile-only scripts/collect-analytics.ts --ep ep005 [--all]');
  process.exit(1);
}

// ─── OAuth2 認証（既存トークンを再利用） ─────────────────────────────────────
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

// ─── エントリポイント ─────────────────────────────────────────────────────────
(async () => {
  const auth = await authorize();

  const useCase = new AnalyzePerformanceUseCase({
    scorecardRepository: new ScorecardManager(ROOT_DIR),
    analyticsClient: new YouTubeAnalyticsAdapter(auth),
    tsvUpdater: new ResultsTsvUpdater(ROOT_DIR),
  });

  try {
    const result = await useCase.execute({
      episodeId: epIdArg,
      allPending: allMode,
    });

    console.log('\n✅ Analytics 収集完了');
    console.log(`   処理: ${result.processedCount}件 / スキップ: ${result.skippedCount}件 / エラー: ${result.errorCount}件`);
    console.log('次のステップ: verdict_engine.py でKEEP/DISCARD判定を実行してください');
  } catch (err) {
    console.error(`❌ エラー: ${(err as Error).message}`);
    process.exit(1);
  }
})();
