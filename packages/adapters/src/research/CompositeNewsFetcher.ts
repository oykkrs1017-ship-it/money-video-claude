/**
 * CompositeNewsFetcher
 *
 * 複数の NewsFetcher（Exa / GDELT 等）を束ね、各ソースの結果をマージする。
 * - 子フェッチャは逐次実行（GDELT 等のレート制限を踏まないため）
 * - 1ソースが落ちても他ソースの結果は返す
 * - URL 重複の除去は後段の NewsScorer.deduplicateAndSort が担うため、ここでは行わない
 *
 * ResearchTopicUseCase は newsFetcher を1個しか持たないため、
 * これを注入することで多ソース化を透過的に実現する（UseCase 無改修）。
 */

import { createLogger } from '@money-video/shared-ts';
import type { NewsItem } from './types';

const logger = createLogger({ name: 'CompositeNewsFetcher', level: 'info' });

/** NewsFetcher port との shape 互換を保つ */
export interface NewsFetcher {
  isAvailable(): boolean;
  searchByKeyword(keyword: string, lookbackDays: number, maxResults: number): Promise<NewsItem[]>;
}

export class CompositeNewsFetcher implements NewsFetcher {
  private readonly fetchers: readonly NewsFetcher[];

  constructor(fetchers: readonly NewsFetcher[]) {
    this.fetchers = fetchers;
  }

  /** いずれかの子ソースが利用可能なら true */
  isAvailable(): boolean {
    return this.fetchers.some((f) => f.isAvailable());
  }

  async searchByKeyword(
    keyword: string,
    lookbackDays: number,
    maxResults: number,
  ): Promise<NewsItem[]> {
    const merged: NewsItem[] = [];
    for (const fetcher of this.fetchers) {
      if (!fetcher.isAvailable()) continue;
      try {
        const items = await fetcher.searchByKeyword(keyword, lookbackDays, maxResults);
        merged.push(...items);
      } catch (err) {
        logger.warn(
          { keyword, err: err instanceof Error ? err.message : String(err) },
          'NewsFetcher 失敗 — 他ソースで継続',
        );
      }
    }
    return merged;
  }
}
