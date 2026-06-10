/**
 * upload-youtube.ts
 * YouTube Data API v3 を使って動画をアップロードするスクリプト
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/upload-youtube.ts --episode <episodeId> [--draft]
 *
 * 初回のみ: ブラウザが開いてGoogleログインが必要です。
 * 認証情報は .credentials/youtube-token.json に保存されます（再利用）。
 *
 * 必要な環境変数 (.env):
 *   YOUTUBE_CLIENT_ID
 *   YOUTUBE_CLIENT_SECRET
 *   YOUTUBE_REFRESH_TOKEN  （初回認証後に自動案内）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';
import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Episode } from '../src/types/episode';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

// ─── 設定 ────────────────────────────────────────────────────────────────────

const CREDENTIALS_DIR = path.join(__dirname, '..', '.credentials');
const CLIENT_SECRET_PATH = path.join(CREDENTIALS_DIR, 'client_secret.json');
const TOKEN_PATH = path.join(CREDENTIALS_DIR, 'youtube-token.json');

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];

const REDIRECT_PORT = 4141;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;

const MAX_RETRY = 3;
const RETRY_BASE_MS = 2000;

// ─── CLI 引数パース ───────────────────────────────────────────────────────────

function parseArgs(): { episodeId: string; isDraft: boolean; isSchedule: boolean } {
  const args = process.argv.slice(2);
  let episodeId = '';
  let isDraft = false;
  let isSchedule = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) episodeId = args[i + 1];
    if (args[i] === '--draft') isDraft = true;
    if (args[i] === '--schedule') isSchedule = true;
  }

  if (!episodeId) {
    console.error('使い方: ts-node scripts/upload-youtube.ts --episode <episodeId> [--draft] [--schedule]');
    process.exit(1);
  }

  return { episodeId, isDraft, isSchedule };
}

// ─── タグ生成（~400文字） ────────────────────────────────────────────────────────

const CHANNEL_TAGS = [
  'AIマネー研究所',
  'お金の勉強',
  '資産形成',
  '投資初心者',
  'マネーリテラシー',
  '新NISA',
  'iDeCo',
  '積立投資',
  'インデックス投資',
  'オルカン',
  'S&P500',
  '複利',
  'ドルコスト平均法',
  '長期投資',
  '分散投資',
  'FIRE',
  '節約',
  '貯金',
  '副業',
  '資産運用',
  '株式投資',
  '投資信託',
  'ETF',
  '配当金',
  '老後資金',
];

function buildTags(episode: Episode): string[] {
  // episode固有タグを先頭に、チャンネル共通タグを後ろに積む
  const all = [...new Set([...episode.tags, ...CHANNEL_TAGS])];
  const result: string[] = [];
  let totalChars = 0;
  for (const tag of all) {
    if (totalChars + tag.length > 400) break;
    result.push(tag);
    totalChars += tag.length + 1; // +1 はセパレータ分
  }
  return result;
}

// ─── 予約投稿: 直近の19:00 JST を UTC ISO 文字列で返す ────────────────────────

function getNextNineteenJST(): string {
  const now = new Date();
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const jstMs = now.getTime() + jstOffsetMs;
  const jstDate = new Date(jstMs);

  // 今日の 19:00 JST = 今日の 10:00 UTC
  const todayAt19Utc = new Date(Date.UTC(
    jstDate.getUTCFullYear(),
    jstDate.getUTCMonth(),
    jstDate.getUTCDate(),
    10, 0, 0, 0
  ));

  // 秒単位まで含めて比較する（19:00:00–19:00:59 JST での過去時刻スケジュールを防ぐ）。
  // 安全マージン 60 秒を加え、ネットワーク遅延で publishAt が過去に転落するのも防ぐ。
  const SAFETY_MARGIN_MS = 60_000;
  const isPast = todayAt19Utc.getTime() <= Date.now() + SAFETY_MARGIN_MS;

  if (isPast) {
    return new Date(todayAt19Utc.getTime() + 24 * 60 * 60 * 1000).toISOString();
  }
  return todayAt19Utc.toISOString();
}

// ─── エピソード読み込み ────────────────────────────────────────────────────────

function loadEpisode(episodeId: string): Episode {
  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ エピソードファイルが見つかりません: ${episodePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(episodePath, 'utf-8')) as Episode;
}

function buildDescription(episode: Episode): string {
  const parts: string[] = [];

  parts.push(episode.description);
  parts.push('─────────────────');
  parts.push(episode.metadata.aiDisclosure);

  const affiliateLinks = episode.metadata.affiliateLinks;
  if (affiliateLinks && affiliateLinks.length > 0) {
    parts.push('─────────────────');
    affiliateLinks.forEach(({ service, url }) => {
      parts.push(`▶ ${service}: ${url}`);
    });
  }

  // ハッシュタグ
  const baseHashtags = ['#AIマネー研究所', '#投資', '#お金'];
  const episodeTags = episode.tags.map((t) => (t.startsWith('#') ? t : `#${t}`));
  const allHashtags = [...new Set([...baseHashtags, ...episodeTags])];
  parts.push(allHashtags.join(' '));

  return parts.join('\n');
}

// ─── OAuth2 認証 ──────────────────────────────────────────────────────────────

function createOAuth2Client(): OAuth2Client {
  // .env の環境変数を優先
  const clientId = process.env.YOUTUBE_CLIENT_ID;
  const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

  if (clientId && clientSecret) {
    return new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);
  }

  // フォールバック: client_secret.json
  if (!fs.existsSync(CLIENT_SECRET_PATH)) {
    console.error(`\n❌ YouTube OAuth2 認証情報が設定されていません。`);
    console.error('\n【設定方法 A: .env ファイル】');
    console.error('  YOUTUBE_CLIENT_ID=<your_client_id>');
    console.error('  YOUTUBE_CLIENT_SECRET=<your_client_secret>');
    console.error('\n【設定方法 B: client_secret.json】');
    console.error(`  ${CLIENT_SECRET_PATH} に配置してください`);
    console.error('\n【Google Cloud Console での取得手順】');
    console.error('  1. https://console.cloud.google.com/ を開く');
    console.error('  2. YouTube Data API v3 を有効化');
    console.error('  3. 「認証情報」→「OAuthクライアントID」→「デスクトップアプリ」');
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(CLIENT_SECRET_PATH, 'utf-8'));
  const { client_id, client_secret } = (raw.installed ?? raw.web) as {
    client_id: string;
    client_secret: string;
  };
  return new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);
}

function saveToken(token: object): void {
  fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(token, null, 2), 'utf-8');
}

async function authorizeWithBrowser(oauth2Client: OAuth2Client): Promise<OAuth2Client> {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  console.log('\n🔐 ブラウザでGoogleにログインしてください:');
  console.log(authUrl);

  // プラットフォームに応じてブラウザを起動
  const { execSync } = await import('child_process');
  try {
    if (process.platform === 'win32') execSync(`start "" "${authUrl}"`, { stdio: 'ignore' });
    else if (process.platform === 'darwin') execSync(`open "${authUrl}"`, { stdio: 'ignore' });
    else execSync(`xdg-open "${authUrl}"`, { stdio: 'ignore' });
  } catch {
    // ブラウザ起動失敗は無視（手動でURLを開いてもらう）
  }

  // ローカルサーバーで認証コードを受け取る
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url!, `http://localhost:${REDIRECT_PORT}`);
      const authCode = url.searchParams.get('code');
      if (authCode) {
        res.end('<h2>✅ 認証完了！このタブを閉じてください。</h2>');
        server.close();
        resolve(authCode);
      } else {
        res.end('<h2>❌ 認証コードが取得できませんでした。</h2>');
        reject(new Error('No code in callback'));
      }
    });
    server.listen(REDIRECT_PORT, () => {
      console.log(`\n⏳ 認証待機中 (port ${REDIRECT_PORT})...`);
    });
    // 5分でタイムアウト
    setTimeout(() => {
      server.close();
      reject(new Error('認証タイムアウト'));
    }, 5 * 60 * 1000);
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);
  saveToken(tokens);
  console.log('✅ 認証トークンを保存しました:', TOKEN_PATH);

  // refresh_token を .env への記載案内（トークン値は出力しない — 保存先ファイルから転記すること）
  if (tokens.refresh_token) {
    console.log('\n💡 次回以降は .env に YOUTUBE_REFRESH_TOKEN を追加すると自動認証されます。');
    console.log(`   値は ${TOKEN_PATH} 内の refresh_token を参照してください（画面には表示しません）。`);
  }

  return oauth2Client;
}

async function authorize(): Promise<OAuth2Client> {
  const oauth2Client = createOAuth2Client();

  // .env の REFRESH_TOKEN を優先
  const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;
  if (refreshToken) {
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    console.log('🔑 .env の YOUTUBE_REFRESH_TOKEN で認証します');
    return oauth2Client;
  }

  // 保存済みトークンがあれば再利用
  if (fs.existsSync(TOKEN_PATH)) {
    const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
    oauth2Client.setCredentials(token);
    // アクセストークンが期限切れなら自動リフレッシュ
    if (token.expiry_date && token.expiry_date < Date.now()) {
      console.log('🔄 アクセストークンをリフレッシュ中...');
      const { credentials } = await oauth2Client.refreshAccessToken();
      oauth2Client.setCredentials(credentials);
      saveToken(credentials);
    }
    return oauth2Client;
  }

  // 初回認証: ブラウザを開いてコードを取得
  return await authorizeWithBrowser(oauth2Client);
}

// ─── YouTube アップロード（リトライ付き） ─────────────────────────────────────

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadWithRetry(
  auth: OAuth2Client,
  videoPath: string,
  episode: Episode,
  privacyStatus: 'public' | 'private',
  publishAt?: string
): Promise<string> {
  const youtube = google.youtube({ version: 'v3', auth });
  const fileSize = fs.statSync(videoPath).size;
  const fileSizeMB = (fileSize / 1024 / 1024).toFixed(1);
  const description = buildDescription(episode);
  const tags = buildTags(episode);
  const tagChars = tags.join(',').length;

  const modeLabel = publishAt
    ? `予約投稿 (${new Date(publishAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} JST)`
    : privacyStatus === 'public' ? '即時公開' : '非公開(ドラフト)';

  console.log(`\n📤 アップロード開始`);
  console.log(`   ファイル   : ${videoPath} (${fileSizeMB} MB)`);
  console.log(`   タイトル   : ${episode.title}`);
  console.log(`   公開設定   : ${modeLabel}`);
  console.log(`   タグ数     : ${tags.length} 件 (${tagChars} 文字)`);
  console.log(`   改変コンテンツ: はい（AI合成音声・キャラクター）\n`);

  let lastAttempt = 0;

  for (let attempt = 1; attempt <= MAX_RETRY; attempt++) {
    if (attempt > 1) {
      const waitMs = RETRY_BASE_MS * Math.pow(2, attempt - 2);
      console.log(`\n🔄 リトライ ${attempt}/${MAX_RETRY} (${waitMs / 1000}秒待機中...)`);
      await sleep(waitMs);
    }

    try {
      let lastProgress = 0;

      const res = await youtube.videos.insert(
        {
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: episode.title,
              description,
              tags,
              categoryId: '22', // People & Blogs（投資・お金系に適切）
              defaultLanguage: 'ja',
            },
            status: {
              privacyStatus,
              selfDeclaredMadeForKids: false,
              containsSyntheticMedia: true,
              ...(publishAt ? { publishAt } : {}),
            },
          },
          media: {
            body: fs.createReadStream(videoPath),
          },
        },
        {
          onUploadProgress: (evt: { bytesRead: number }) => {
            const progress = Math.round((evt.bytesRead / fileSize) * 100);
            if (progress >= lastProgress + 5) {
              process.stdout.write(
                `\r   進捗: ${progress}% (${(evt.bytesRead / 1024 / 1024).toFixed(1)} MB / ${fileSizeMB} MB)`
              );
              lastProgress = progress;
            }
          },
        }
      );

      console.log('\n');

      const videoId = res.data.id!;
      const videoUrl = `https://youtu.be/${videoId}`;

      console.log('✅ アップロード完了！');
      console.log(`   動画ID  : ${videoId}`);
      console.log(`   URL     : ${videoUrl}`);
      console.log(`   管理画面: https://studio.youtube.com/video/${videoId}/edit\n`);

      return videoId;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ アップロードエラー (試行 ${attempt}/${MAX_RETRY}): ${message}`);
      lastAttempt = attempt;

      if (attempt === MAX_RETRY) {
        throw new Error(`${MAX_RETRY}回試行しましたが失敗しました: ${message}`);
      }
    }
  }

  // ここには到達しないが TypeScript を満足させる
  throw new Error(`アップロード失敗 (試行回数: ${lastAttempt})`);
}

// ─── 結果保存 ─────────────────────────────────────────────────────────────────

function saveResult(
  episodeId: string,
  videoId: string,
  episode: Episode,
  privacyStatus: string,
  outDir: string,
): void {
  fs.mkdirSync(outDir, { recursive: true });
  const resultPath = path.join(outDir, `${episodeId}_upload_result.json`);

  const result = {
    videoId,
    videoUrl: `https://youtu.be/${videoId}`,
    title: episode.title,
    privacyStatus,
    uploadedAt: new Date().toISOString(),
  };

  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf-8');
  console.log(`   結果JSON: ${resultPath}`);
}

// ─── エントリポイント ─────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { episodeId, isDraft, isSchedule } = parseArgs();
  const privacyStatus = (isDraft || isSchedule) ? 'private' : 'public';
  const publishAt = isSchedule ? getNextNineteenJST() : undefined;

  const episode = loadEpisode(episodeId);

  const outDir = process.env.OUTPUT_DIR ?? path.join(__dirname, '../out');
  const videoPath = path.join(outDir, `${episodeId}.mp4`);

  if (!fs.existsSync(videoPath)) {
    console.error(`❌ 動画ファイルが見つかりません: ${videoPath}`);
    console.error('   先に render-video.ts でレンダリングしてください。');
    process.exit(1);
  }

  const auth = await authorize();
  const videoId = await uploadWithRetry(auth, videoPath, episode, privacyStatus, publishAt);
  saveResult(episodeId, videoId, episode, isSchedule ? `scheduled:${publishAt}` : privacyStatus, outDir);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('❌ エラー:', message);
  process.exit(1);
});
