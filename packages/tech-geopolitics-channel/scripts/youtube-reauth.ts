/**
 * scripts/youtube-reauth.ts
 * YouTube OAuth2 再認証スクリプト
 * 実行後に表示される新しい YOUTUBE_REFRESH_TOKEN を .env に貼り替えてください
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/youtube-reauth.ts
 */

import fs from 'fs';
import path from 'path';
import http from 'http';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// .env 読み込み
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) dotenv.config({ path: envPath });

const clientId = process.env.YOUTUBE_CLIENT_ID;
const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error('❌ YOUTUBE_CLIENT_ID または YOUTUBE_CLIENT_SECRET が未設定です');
  process.exit(1);
}

const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];

const REDIRECT_URI = 'http://localhost:8080/callback';

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI);

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent',
});

console.log('\n🔐 YouTube OAuth2 再認証\n');
console.log('1. 以下のURLをブラウザで開いてください:');
console.log('\n' + authUrl + '\n');
console.log('2. Googleアカウントでログインして許可してください');
console.log('3. 認証後、このスクリプトが自動でトークンを取得します...\n');

// ローカルサーバーでコールバックを受け取る
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:8080`);
  const code = url.searchParams.get('code');

  if (!code) {
    res.writeHead(400);
    res.end('認証コードが取得できませんでした');
    return;
  }

  try {
    const { tokens } = await oauth2Client.getToken(code);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>認証成功！</h1><p>このタブを閉じてターミナルを確認してください。</p>');

    console.log('\n✅ 認証成功！\n');
    console.log('━'.repeat(60));
    console.log('以下の値を packages/.env の YOUTUBE_REFRESH_TOKEN に貼り替えてください:');
    console.log('━'.repeat(60));
    console.log(`\nYOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log('━'.repeat(60));

    if (tokens.refresh_token) {
      // .env を自動更新するか確認
      const envContent = fs.readFileSync(envPath, 'utf8');
      if (envContent.includes('YOUTUBE_REFRESH_TOKEN=')) {
        const updated = envContent.replace(
          /YOUTUBE_REFRESH_TOKEN=.*/,
          `YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`
        );
        fs.writeFileSync(envPath, updated, 'utf8');
        console.log('✅ .env を自動更新しました');
      } else {
        console.log('⚠️  .env に YOUTUBE_REFRESH_TOKEN の行がありません。手動で追加してください');
      }
    }
  } catch (err) {
    res.writeHead(500);
    res.end('トークン取得に失敗しました');
    console.error('❌ エラー:', (err as Error).message);
  } finally {
    server.close();
    process.exit(0);
  }
});

server.listen(8080, () => {
  console.log('⏳ ブラウザでの認証待機中... (ポート8080)');
});
