/**
 * ExaNewsFetcher
 *
 * Exa API を使ってキーワードでニュースを検索する。
 * EXA_API_KEY が未設定の場合は isAvailable() が false を返す。
 */

import * as https from 'https';
import { createLogger } from '@money-video/shared-ts';
import type { NewsItem } from './types';

const logger = createLogger({ name: 'ExaNewsFetcher', level: 'info' });

/** NewsFetcher port との shape 互換を保つ */
export interface NewsFetcher {
  isAvailable(): boolean;
  searchByKeyword(keyword: string, lookbackDays: number, maxResults: number): Promise<NewsItem[]>;
}

interface ExaResult {
  title?: string;
  url?: string;
  highlights?: string[];
  publishedDate?: string;
}

interface ExaResponse {
  results?: ExaResult[];
  error?: string;
}

export class ExaNewsFetcher implements NewsFetcher {
  private readonly apiKey: string | undefined;

  constructor(apiKey?: string) {
    this.apiKey = apiKey ?? process.env['EXA_API_KEY'];
    if (!this.apiKey) {
      logger.warn('EXA_API_KEY が未設定 — ニュース取得をスキップします');
    }
  }

  isAvailable(): boolean {
    return !!this.apiKey;
  }

  async searchByKeyword(
    keyword: string,
    lookbackDays: number,
    maxResults: number,
  ): Promise<NewsItem[]> {
    if (!this.apiKey) return [];

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - lookbackDays);
    const startDateStr = startDate.toISOString().slice(0, 10);

    const body = JSON.stringify({
      query: keyword,
      num_results: maxResults,
      start_published_date: startDateStr,
      type: 'auto',
      category: 'news',
      contents: {
        highlights: {
          max_characters: 500,
          query: keyword,
        },
      },
    });

    return new Promise((resolve) => {
      const req = https.request(
        {
          hostname: 'api.exa.ai',
          path: '/search',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey!,
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk: Buffer) => (data += chunk.toString()));
          res.on('end', () => {
            try {
              const json = JSON.parse(data) as ExaResponse;
              if (json.error) {
                logger.warn({ keyword, error: json.error }, 'Exa API エラー応答');
                resolve([]);
                return;
              }
              const items: NewsItem[] = (json.results ?? []).map((r) => ({
                keyword,
                title: r.title ?? '',
                url: r.url ?? '',
                summary: (r.highlights ?? []).join(' ').slice(0, 200),
                published: r.publishedDate ? r.publishedDate.slice(0, 10) : null,
              }));
              logger.info({ keyword, count: items.length }, 'ニュース取得完了');
              resolve(items);
            } catch (err) {
              logger.error({ keyword, err: err instanceof Error ? err.message : String(err) }, 'Exa レスポンスのパースに失敗');
              resolve([]);
            }
          });
        },
      );
      req.on('error', (err) => {
        logger.error({ keyword, err: err.message }, 'Exa API リクエストエラー');
        resolve([]);
      });
      req.write(body);
      req.end();
    });
  }
}
