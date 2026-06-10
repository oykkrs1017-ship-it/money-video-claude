/**
 * GdeltNewsFetcher
 *
 * GDELT 2.0 DOC API でキーワードニュースを検索する。APIキー不要。
 * Exa（neural・英語要約主体）とはソース国・論調が異なるため、
 * 同一テーマを別ソースで重ねて「多角的視点」を補強する。
 * 取得失敗・レート制限(429)時は [] を返してパイプラインを止めない。
 */

import { createLogger } from '@money-video/shared-ts';
import { httpGetJson, type FetchJson } from './httpGetJson';
import type { NewsItem } from './types';

const logger = createLogger({ name: 'GdeltNewsFetcher', level: 'info' });

const GDELT_ENDPOINT = 'https://api.gdeltproject.org/api/v2/doc/doc';

/** NewsFetcher port との shape 互換を保つ */
export interface NewsFetcher {
  isAvailable(): boolean;
  searchByKeyword(keyword: string, lookbackDays: number, maxResults: number): Promise<NewsItem[]>;
}

interface GdeltArticle {
  url?: string;
  title?: string;
  seendate?: string;
  domain?: string;
  language?: string;
  sourcecountry?: string;
}

interface GdeltResponse {
  articles?: GdeltArticle[];
}

/** 'YYYYMMDDTHHMMSSZ' → 'YYYY-MM-DD' */
function parseSeendate(seendate: string | undefined): string | null {
  if (!seendate || seendate.length < 8) return null;
  return `${seendate.slice(0, 4)}-${seendate.slice(4, 6)}-${seendate.slice(6, 8)}`;
}

export class GdeltNewsFetcher implements NewsFetcher {
  private readonly fetchJson: FetchJson;

  constructor(fetchJson: FetchJson = (url) => httpGetJson(url)) {
    this.fetchJson = fetchJson;
  }

  /** キー不要のため常に利用可能 */
  isAvailable(): boolean {
    return true;
  }

  async searchByKeyword(
    keyword: string,
    lookbackDays: number,
    maxResults: number,
  ): Promise<NewsItem[]> {
    const trimmed = keyword.trim();
    // GDELT は極端に短いクエリでエラーを返すためスキップ
    if (trimmed.length < 2) return [];

    const timespan = `${Math.max(1, Math.floor(lookbackDays))}d`;
    const records = Math.min(Math.max(1, maxResults), 250);
    const url =
      `${GDELT_ENDPOINT}?query=${encodeURIComponent(trimmed)}` +
      `&mode=ArtList&format=json&sort=DateDesc` +
      `&timespan=${timespan}&maxrecords=${records}`;

    try {
      const json = (await this.fetchJson(url)) as GdeltResponse;
      const items: NewsItem[] = (json.articles ?? [])
        .filter((a): a is GdeltArticle => !!a.url && !!a.title)
        .map((a) => ({
          keyword,
          title: a.title ?? '',
          url: a.url ?? '',
          // ArtList には本文要約が無いため、ソース識別子で補う
          summary: [a.domain, a.sourcecountry].filter(Boolean).join(' / '),
          published: parseSeendate(a.seendate),
        }));
      logger.info({ keyword, count: items.length }, 'GDELT ニュース取得完了');
      return items;
    } catch (err) {
      logger.warn(
        { keyword, err: err instanceof Error ? err.message : String(err) },
        'GDELT 取得失敗 — スキップ',
      );
      return [];
    }
  }
}
