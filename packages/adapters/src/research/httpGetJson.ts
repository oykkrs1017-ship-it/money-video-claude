/**
 * httpGet ヘルパ
 *
 * キー不要の外部 API を GET するための最小ヘルパ。
 * GdeltNewsFetcher / MacroSnapshotFetcher（JSON）と RssFeedFetcher（テキスト/XML）が共有する。
 * 既存アダプタ（ExaNewsFetcher）と同じく Node 標準の https を使い、
 * fetch のグローバル型依存を避ける。
 */

import * as https from 'https';

/** テストで差し替え可能な JSON フェッチャ型 */
export type FetchJson = (url: string) => Promise<unknown>;
/** テストで差し替え可能なテキストフェッチャ型（RSS/Atom 等） */
export type FetchText = (url: string) => Promise<string>;

const DEFAULT_USER_AGENT = 'money-video-research/1.0';

/**
 * 指定 URL を GET して本文文字列を返す。
 * 2xx 以外・通信エラーは reject する（呼び出し側で握りつぶす想定）。
 */
export function httpGetText(url: string, userAgent: string = DEFAULT_USER_AGENT): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': userAgent } }, (res) => {
      const status = res.statusCode ?? 0;
      let data = '';
      res.on('data', (chunk: Buffer) => (data += chunk.toString()));
      res.on('end', () => {
        if (status < 200 || status >= 300) {
          reject(new Error(`HTTP ${status}`));
          return;
        }
        resolve(data);
      });
    });
    req.on('error', (err: Error) => reject(err));
    req.end();
  });
}

/**
 * 指定 URL を GET して JSON をパースして返す。
 * 2xx 以外・パース失敗・通信エラーは reject する。
 */
export async function httpGetJson(
  url: string,
  userAgent: string = DEFAULT_USER_AGENT,
): Promise<unknown> {
  const text = await httpGetText(url, userAgent);
  return JSON.parse(text);
}
