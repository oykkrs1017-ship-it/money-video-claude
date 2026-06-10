/**
 * GdeltNewsFetcher のユニットテスト（ネットワーク非依存・FetchJson 注入）
 */

import { describe, expect, it, vi } from 'vitest';
import { GdeltNewsFetcher } from './GdeltNewsFetcher';

const SAMPLE_RESPONSE = {
  articles: [
    {
      url: 'https://reuters.com/a',
      title: 'Semiconductor export curbs tighten',
      seendate: '20260603T120000Z',
      domain: 'reuters.com',
      language: 'English',
      sourcecountry: 'United States',
    },
    {
      // url 欠落 → 除外される
      title: 'No URL article',
      seendate: '20260602T000000Z',
      domain: 'example.com',
    },
  ],
};

describe('GdeltNewsFetcher', () => {
  it('キー不要のため常に isAvailable', () => {
    expect(new GdeltNewsFetcher(async () => ({})).isAvailable()).toBe(true);
  });

  it('GDELT レスポンスを NewsItem にマップし、url/title 欠落は除外する', async () => {
    const fetcher = new GdeltNewsFetcher(async () => SAMPLE_RESPONSE);
    const items = await fetcher.searchByKeyword('半導体 輸出規制', 7, 5);

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({
      keyword: '半導体 輸出規制',
      title: 'Semiconductor export curbs tighten',
      url: 'https://reuters.com/a',
      summary: 'reuters.com / United States',
      published: '2026-06-03',
    });
  });

  it('seendate を YYYY-MM-DD に変換する', async () => {
    const fetcher = new GdeltNewsFetcher(async () => ({
      articles: [{ url: 'https://x.com', title: 'T', seendate: '20251231T235959Z' }],
    }));
    const [item] = await fetcher.searchByKeyword('AI', 3, 1);
    expect(item.published).toBe('2025-12-31');
  });

  it('短すぎるキーワードは API を叩かず [] を返す', async () => {
    const spy = vi.fn(async (_url: string) => SAMPLE_RESPONSE);
    const fetcher = new GdeltNewsFetcher(spy);
    const items = await fetcher.searchByKeyword('a', 7, 5);
    expect(items).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('取得失敗時は [] を返してパイプラインを止めない', async () => {
    const fetcher = new GdeltNewsFetcher(async () => {
      throw new Error('HTTP 429');
    });
    const items = await fetcher.searchByKeyword('AI データセンター', 7, 5);
    expect(items).toEqual([]);
  });

  it('lookbackDays / maxResults を timespan・maxrecords にエンコードする', async () => {
    const spy = vi.fn(async (_url: string) => ({ articles: [] }));
    const fetcher = new GdeltNewsFetcher(spy);
    await fetcher.searchByKeyword('TSMC', 7, 5);
    const calledUrl = spy.mock.calls[0][0];
    expect(calledUrl).toContain('timespan=7d');
    expect(calledUrl).toContain('maxrecords=5');
    expect(calledUrl).toContain('query=TSMC');
  });
});
