/**
 * YouTubeAuth: OAuth2 認証フロー（googleapis）
 *
 * トークン保存 / リフレッシュ / ブラウザ認証を一元管理する。
 * google-auth-library を直接 import せず、googleapis 経由で OAuth2Client を取得する。
 */

import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import * as child_process from 'child_process';
import { google } from 'googleapis';
import { AdapterError } from '@money-video/shared-ts';

const SCOPES = [
  'https://www.googleapis.com/auth/youtube.upload',
  'https://www.googleapis.com/auth/youtube.readonly',
  'https://www.googleapis.com/auth/yt-analytics.readonly',
];
const REDIRECT_PORT = 4141;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/oauth2callback`;
const AUTH_TIMEOUT_MS = 5 * 60 * 1000;

/** googleapis 内蔵の OAuth2Client 型エイリアス */
export type GoogleOAuth2Client = InstanceType<typeof google.auth.OAuth2>;

export interface YouTubeAuthConfig {
  credentialsDir: string;
}

export class YouTubeAuth {
  private readonly credentialsDir: string;
  private readonly clientSecretPath: string;
  private readonly tokenPath: string;

  constructor(config: YouTubeAuthConfig) {
    this.credentialsDir = config.credentialsDir;
    this.clientSecretPath = path.join(config.credentialsDir, 'client_secret.json');
    this.tokenPath = path.join(config.credentialsDir, 'youtube-token.json');
  }

  async authorize(): Promise<GoogleOAuth2Client> {
    if (!fs.existsSync(this.clientSecretPath)) {
      throw new AdapterError(
        `認証情報ファイルが見つかりません: ${this.clientSecretPath}\n` +
          '手順: Google Cloud Console > OAuth クライアント ID（デスクトップ）を作成し\n' +
          `${this.credentialsDir}/client_secret.json に配置してください`,
        'youtube-auth',
      );
    }

    const raw = JSON.parse(fs.readFileSync(this.clientSecretPath, 'utf8')) as Record<
      string,
      Record<string, string>
    >;
    const { client_id, client_secret } = raw.installed ?? raw.web ?? {};
    if (!client_id || !client_secret) {
      throw new AdapterError(
        'client_secret.json に client_id / client_secret がありません',
        'youtube-auth',
      );
    }

    const oauth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

    if (fs.existsSync(this.tokenPath)) {
      const token = JSON.parse(fs.readFileSync(this.tokenPath, 'utf8')) as {
        expiry_date?: number;
        [key: string]: unknown;
      };
      oauth2Client.setCredentials(token);
      if (token.expiry_date && token.expiry_date < Date.now()) {
        const { credentials } = await oauth2Client.refreshAccessToken();
        oauth2Client.setCredentials(credentials);
        this.saveToken(credentials);
      }
      return oauth2Client;
    }

    return this.authorizeWithBrowser(oauth2Client);
  }

  private saveToken(token: object): void {
    fs.mkdirSync(this.credentialsDir, { recursive: true });
    fs.writeFileSync(this.tokenPath, JSON.stringify(token, null, 2), 'utf8');
  }

  private async authorizeWithBrowser(oauth2Client: GoogleOAuth2Client): Promise<GoogleOAuth2Client> {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
    });

    try {
      if (process.platform === 'win32') {
        child_process.execSync(`start "" "${authUrl}"`, { stdio: 'ignore' });
      } else if (process.platform === 'darwin') {
        child_process.execSync(`open "${authUrl}"`, { stdio: 'ignore' });
      } else {
        child_process.execSync(`xdg-open "${authUrl}"`, { stdio: 'ignore' });
      }
    } catch {
      // ブラウザ起動失敗は無視（手動で URL を開いてもらう）
    }

    process.stdout.write(`\n🔐 ブラウザで認証してください:\n${authUrl}\n`);

    const code = await new Promise<string>((resolve, reject) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url ?? '/', `http://localhost:${REDIRECT_PORT}`);
        const receivedCode = url.searchParams.get('code');
        if (receivedCode) {
          res.end('<h2>✅ 認証完了！このタブを閉じてください。</h2>');
          clearTimeout(timeoutId);
          server.close();
          resolve(receivedCode);
        } else {
          res.end('<h2>❌ 認証コードが取得できませんでした。</h2>');
          clearTimeout(timeoutId);
          server.close();
          reject(new AdapterError('No code in OAuth2 callback', 'youtube-auth'));
        }
      });

      server.listen(REDIRECT_PORT, () => {
        process.stdout.write(`⏳ 認証待機中 (port ${REDIRECT_PORT})...\n`);
      });

      // タイムアウト後に server を閉じて reject する。
      // 認証成功 / 失敗ブランチで clearTimeout することでプロセスが5分間ハングするのを防ぐ。
      const timeoutId = setTimeout(() => {
        server.close();
        reject(new AdapterError('OAuth2 認証タイムアウト（5分）', 'youtube-auth'));
      }, AUTH_TIMEOUT_MS);
    });

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    this.saveToken(tokens);
    process.stdout.write(`✅ 認証トークンを保存しました: ${this.tokenPath}\n`);
    return oauth2Client;
  }
}
