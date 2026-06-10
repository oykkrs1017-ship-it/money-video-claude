/**
 * RssFeedFetcher
 *
 * 政府・中央銀行の公式プレスリリース RSS/Atom を取得する（全て APIキー不要・無料）。
 * 競合（ガーコ等）が使わない「1次プレス」を拾うことで、台本の独自性・権威性を高める
 * （Inauthentic Content Policy 対策に整合）。
 *
 * キーワード検索ではなくフィード型のため NewsFetcher とは別ポート（FeedFetcher）。
 * 取得失敗時は該当フィードをスキップし、他フィード・パイプラインは継続する。
 *
 * 依存を増やさないため最小の RSS2.0 / Atom パーサを内蔵する（壊れたら graceful に空配列）。
 */

import { createLogger } from '@money-video/shared-ts';
import { httpGetText, type FetchText } from './httpGetJson';
import type { NewsItem } from './types';

const logger = createLogger({ name: 'RssFeedFetcher', level: 'info' });

export interface FeedSource {
  /** ニュース行に表示するソース名（例: '日銀'） */
  label: string;
  url: string;
}

/** FeedFetcher port との shape 互換を保つ */
export interface FeedFetcher {
  isAvailable(): boolean;
  fetchAll(lookbackDays: number, maxPerFeed: number): Promise<NewsItem[]>;
}

/** 既定の1次プレスフィード（2026-06-04 実在・キー不要を確認済み） */
export const DEFAULT_FEEDS: readonly FeedSource[] = [
  { label: '日銀', url: 'https://www.boj.or.jp/rss/whatsnew.xml' },
  { label: 'Fed', url: 'https://www.federalreserve.gov/feeds/press_all.xml' },
  { label: '金融庁', url: 'https://www.fsa.go.jp/fsaNewsListAll_rss2.xml' },
  { label: '経産省', url: 'https://www.meti.go.jp/ml_index_release_atom.xml' },
];

interface RawFeedItem {
  title: string;
  url: string;
  summary: string;
  published: string | null;
}

// ─── 最小 RSS2.0 / Atom パーサ ──────────────────────────────────────────────────

function stripCdataAndTags(raw: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** ブロック内の <tag>...</tag> の中身を返す（最初の1つ） */
function extractTag(block: string, tag: string): string | null {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? m[1]! : null;
}

/** Atom の <link ... href="..."/>（rel="alternate" 優先） */
function extractAtomLink(block: string): string {
  const alt = block.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i);
  if (alt) return alt[1]!;
  const any = block.match(/<link[^>]*href=["']([^"']+)["']/i);
  return any ? any[1]! : '';
}

/** RFC822 / ISO8601 文字列 → 'YYYY-MM-DD'（パース不能なら null） */
function toYmd(raw: string | null): string | null {
  // JS の Date は 'JST' 等の略称TZを解釈できないため数値オフセットに正規化（日本の官公庁RSS対策）
  const cleaned = stripCdataAndTags(raw)
    .replace(/\bJST\b/i, 'GMT+0900')
    .replace(/\bJDT\b/i, 'GMT+0900');
  if (!cleaned) return null;
  const d = new Date(cleaned);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function parseFeed(xml: string): RawFeedItem[] {
  const isAtom = /<feed[\s>]/i.test(xml);
  const blockRe = isAtom ? /<entry[^>]*>([\s\S]*?)<\/entry>/gi : /<item[^>]*>([\s\S]*?)<\/item>/gi;

  const items: RawFeedItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(xml)) !== null) {
    const block = m[1]!;
    const title = stripCdataAndTags(extractTag(block, 'title'));
    const url = isAtom ? extractAtomLink(block) : stripCdataAndTags(extractTag(block, 'link'));
    const summary = stripCdataAndTags(
      extractTag(block, isAtom ? 'summary' : 'description') ?? extractTag(block, 'content'),
    );
    const published = toYmd(
      isAtom
        ? (extractTag(block, 'updated') ?? extractTag(block, 'published'))
        : extractTag(block, 'pubDate'),
    );
    if (title && url) {
      items.push({ title, url, summary: summary.slice(0, 200), published });
    }
  }
  return items;
}

// ─── アダプタ本体 ──────────────────────────────────────────────────────────────

export class RssFeedFetcher implements FeedFetcher {
  private readonly feeds: readonly FeedSource[];
  private readonly fetchText: FetchText;

  constructor(
    feeds: readonly FeedSource[] = DEFAULT_FEEDS,
    fetchText: FetchText = (url) => httpGetText(url),
  ) {
    this.feeds = feeds;
    this.fetchText = fetchText;
  }

  isAvailable(): boolean {
    return this.feeds.length > 0;
  }

  async fetchAll(lookbackDays: number, maxPerFeed: number): Promise<NewsItem[]> {
    const cutoff = Date.now() - Math.max(1, lookbackDays) * 24 * 60 * 60 * 1000;
    const out: NewsItem[] = [];

    for (const feed of this.feeds) {
      try {
        const xml = await this.fetchText(feed.url);
        const recent = parseFeed(xml)
          // 日付不明は除外せず採用（フィードは新着順のため）。日付ありは lookback 内のみ。
          .filter((i) => i.published === null || new Date(i.published).getTime() >= cutoff)
          .slice(0, Math.max(1, maxPerFeed))
          .map(
            (i): NewsItem => ({
              keyword: feed.label,
              title: i.title,
              url: i.url,
              summary: i.summary,
              published: i.published,
            }),
          );
        logger.info({ feed: feed.label, count: recent.length }, '1次プレスフィード取得完了');
        out.push(...recent);
      } catch (err) {
        logger.warn(
          { feed: feed.label, err: err instanceof Error ? err.message : String(err) },
          'フィード取得失敗 — スキップ',
        );
      }
    }
    return out;
  }
}
