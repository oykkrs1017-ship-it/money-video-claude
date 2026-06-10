/**
 * RssFeedFetcher のユニットテスト（ネットワーク非依存・FetchText 注入）
 */

import { describe, expect, it } from 'vitest';
import { RssFeedFetcher, type FeedSource } from './RssFeedFetcher';

const TODAY = new Date().toISOString().slice(0, 10);

const RSS_XML = `<?xml version="1.0"?>
<rss version="2.0"><channel>
  <title>Bank of Japan</title>
  <item>
    <title><![CDATA[政策金利を据え置き]]></title>
    <link><![CDATA[https://www.boj.or.jp/a.htm]]></link>
    <description><![CDATA[本日の金融政策決定会合について]]></description>
    <pubDate><![CDATA[${new Date().toUTCString()}]]></pubDate>
  </item>
  <item>
    <title>古いお知らせ</title>
    <link>https://www.boj.or.jp/old.htm</link>
    <description>2年前の記事</description>
    <pubDate>Mon, 1 Jun 2020 00:00:00 GMT</pubDate>
  </item>
</channel></rss>`;

const ATOM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>経済産業省</title>
  <entry>
    <title>半導体補助金の公募を開始</title>
    <link rel="alternate" type="text/html" href="https://www.meti.go.jp/press/x.html" />
    <updated>${TODAY}T05:00:00Z</updated>
    <summary>先端半導体の国内製造支援について</summary>
  </entry>
</feed>`;

function fakeFetch(map: Record<string, string>) {
  return async (url: string): Promise<string> => {
    const hit = map[url];
    if (hit === undefined) throw new Error(`HTTP 404 ${url}`);
    return hit;
  };
}

describe('RssFeedFetcher', () => {
  const feeds: FeedSource[] = [
    { label: '日銀', url: 'https://boj/rss' },
    { label: '経産省', url: 'https://meti/atom' },
  ];

  it('RSS2.0 と Atom 双方をパースし NewsItem に変換する', async () => {
    const fetcher = new RssFeedFetcher(
      feeds,
      fakeFetch({ 'https://boj/rss': RSS_XML, 'https://meti/atom': ATOM_XML }),
    );
    const items = await fetcher.fetchAll(7, 10);

    // 日銀: 新しい1件のみ（古い2020記事は lookback で除外）／経産省: 1件
    const boj = items.find((i) => i.keyword === '日銀');
    const meti = items.find((i) => i.keyword === '経産省');

    expect(items.filter((i) => i.keyword === '日銀')).toHaveLength(1);
    expect(boj?.title).toBe('政策金利を据え置き');
    expect(boj?.url).toBe('https://www.boj.or.jp/a.htm');
    expect(boj?.published).toBe(TODAY);

    expect(meti?.title).toBe('半導体補助金の公募を開始');
    expect(meti?.url).toBe('https://www.meti.go.jp/press/x.html'); // Atom href 抽出
    expect(meti?.published).toBe(TODAY);
  });

  it('lookbackDays を超える古い記事は除外する', async () => {
    const fetcher = new RssFeedFetcher(
      [{ label: '日銀', url: 'https://boj/rss' }],
      fakeFetch({ 'https://boj/rss': RSS_XML }),
    );
    const items = await fetcher.fetchAll(7, 10);
    expect(items.every((i) => i.title !== '古いお知らせ')).toBe(true);
  });

  it('maxPerFeed でフィードあたり件数を制限する', async () => {
    // lookback を十分長くして両 item を対象にし、上限1で絞る
    const fetcher = new RssFeedFetcher(
      [{ label: '日銀', url: 'https://boj/rss' }],
      fakeFetch({ 'https://boj/rss': RSS_XML }),
    );
    const items = await fetcher.fetchAll(99999, 1);
    expect(items).toHaveLength(1);
  });

  it('1フィードが落ちても他フィードは返す', async () => {
    const fetcher = new RssFeedFetcher(
      feeds,
      fakeFetch({ 'https://meti/atom': ATOM_XML }), // boj は 404
    );
    const items = await fetcher.fetchAll(7, 10);
    expect(items).toHaveLength(1);
    expect(items[0]!.keyword).toBe('経産省');
  });

  it('feeds が空なら isAvailable=false', () => {
    expect(new RssFeedFetcher([]).isAvailable()).toBe(false);
    expect(new RssFeedFetcher(feeds, fakeFetch({})).isAvailable()).toBe(true);
  });

  it('JST タイムゾーン（金融庁形式）の pubDate をパースする', async () => {
    const jstXml = `<?xml version="1.0"?><rss version="2.0"><channel>
      <item>
        <title>つみたて投資枠対象商品を更新</title>
        <link>https://www.fsa.go.jp/nisa.html</link>
        <description />
        <pubDate>Thu, 04 Jun 2026 17:00:00 JST</pubDate>
      </item>
    </channel></rss>`;
    const fetcher = new RssFeedFetcher(
      [{ label: '金融庁', url: 'https://fsa/rss' }],
      fakeFetch({ 'https://fsa/rss': jstXml }),
    );
    const items = await fetcher.fetchAll(99999, 5);
    expect(items).toHaveLength(1);
    // 17:00 JST = 08:00 UTC 同日
    expect(items[0]!.published).toBe('2026-06-04');
  });
});
