/**
 * CompositeNewsFetcher のユニットテスト
 */

import { describe, expect, it } from 'vitest';
import { CompositeNewsFetcher, type NewsFetcher } from './CompositeNewsFetcher';
import type { NewsItem } from './types';

function makeItem(keyword: string, url: string): NewsItem {
  return { keyword, title: `T-${url}`, url, summary: '', published: null };
}

function stubFetcher(
  items: NewsItem[],
  opts: { available?: boolean; throws?: boolean } = {},
): NewsFetcher {
  return {
    isAvailable: () => opts.available ?? true,
    searchByKeyword: async () => {
      if (opts.throws) throw new Error('source down');
      return items;
    },
  };
}

describe('CompositeNewsFetcher', () => {
  it('複数ソースの結果をマージする', async () => {
    const a = stubFetcher([makeItem('k', 'https://a.com/1')]);
    const b = stubFetcher([makeItem('k', 'https://b.com/1'), makeItem('k', 'https://b.com/2')]);
    const composite = new CompositeNewsFetcher([a, b]);

    const items = await composite.searchByKeyword('k', 7, 5);
    expect(items.map((i) => i.url)).toEqual([
      'https://a.com/1',
      'https://b.com/1',
      'https://b.com/2',
    ]);
  });

  it('1ソースが落ちても他ソースの結果は返す', async () => {
    const ok = stubFetcher([makeItem('k', 'https://ok.com/1')]);
    const broken = stubFetcher([], { throws: true });
    const composite = new CompositeNewsFetcher([broken, ok]);

    const items = await composite.searchByKeyword('k', 7, 5);
    expect(items.map((i) => i.url)).toEqual(['https://ok.com/1']);
  });

  it('利用不可のソースはスキップする', async () => {
    const unavailable = stubFetcher([makeItem('k', 'https://nope.com/1')], { available: false });
    const ok = stubFetcher([makeItem('k', 'https://ok.com/1')]);
    const composite = new CompositeNewsFetcher([unavailable, ok]);

    const items = await composite.searchByKeyword('k', 7, 5);
    expect(items.map((i) => i.url)).toEqual(['https://ok.com/1']);
  });

  it('isAvailable はいずれかが利用可能なら true', () => {
    expect(
      new CompositeNewsFetcher([
        stubFetcher([], { available: false }),
        stubFetcher([], { available: true }),
      ]).isAvailable(),
    ).toBe(true);

    expect(
      new CompositeNewsFetcher([
        stubFetcher([], { available: false }),
        stubFetcher([], { available: false }),
      ]).isAvailable(),
    ).toBe(false);
  });
});
