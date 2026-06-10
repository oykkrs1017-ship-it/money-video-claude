/**
 * RedditPostFetcher
 *
 * rdt-cli を使って Reddit の投資コミュニティから投稿を取得する（APIキー不要・無料）。
 * rdt-cli が未インストールの場合は isAvailable() が false を返し、パイプラインを止めない。
 *
 * 事前準備:
 *   pip install rdt-cli  # または pipx install rdt-cli
 *   rdt login            # Cookie 認証（ログイン不要のサブレディットは省略可）
 *
 * 使用サブレディット: investing / japanfinance / stocks（投資家感情・トレンドKW向け）
 */

import { spawnSync } from 'child_process';
import { createLogger } from '@money-video/shared-ts';
import type { NewsItem } from './types';

const logger = createLogger({ name: 'RedditPostFetcher', level: 'info' });

/** NewsFetcher port との shape 互換を保つ */
export interface NewsFetcher {
  isAvailable(): boolean;
  searchByKeyword(keyword: string, lookbackDays: number, maxResults: number): Promise<NewsItem[]>;
}

const RDT_TIMEOUT_MS = 15_000;
const DEFAULT_SUBREDDITS = ['investing', 'japanfinance', 'stocks'];
const MAX_PER_SUBREDDIT = 3;

interface RedditPostRaw {
  title?: string;
  url?: string;
  selftext?: string;
  subreddit?: string;
  score?: number;
  created_utc?: number;
  permalink?: string;
}

/** rdt-cli の stdout を RedditPostRaw[] にパース（配列・ラップ済みオブジェクト両対応） */
function parseRdtOutput(stdout: string): RedditPostRaw[] {
  const text = stdout.trim();
  if (!text) return [];
  try {
    const parsed = JSON.parse(text) as unknown;
    if (Array.isArray(parsed)) return parsed as RedditPostRaw[];
    // { data: { children: [{ data: {...} }] } } — Reddit API 形式
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'data' in parsed &&
      typeof (parsed as Record<string, unknown>)['data'] === 'object'
    ) {
      const inner = (parsed as { data: { children?: unknown[] } }).data;
      if (Array.isArray(inner.children)) {
        return inner.children.map((c) => {
          const child = c as { data?: RedditPostRaw };
          return child.data ?? (c as RedditPostRaw);
        });
      }
    }
  } catch {
    // JSON パース失敗は graceful skip
  }
  return [];
}

export class RedditPostFetcher implements NewsFetcher {
  private readonly subreddits: readonly string[];
  private readonly rdtAvailable: boolean;

  constructor(subreddits: readonly string[] = DEFAULT_SUBREDDITS) {
    this.subreddits = subreddits;
    this.rdtAvailable = checkRdt();
  }

  isAvailable(): boolean {
    return this.rdtAvailable;
  }

  async searchByKeyword(
    keyword: string,
    _lookbackDays: number,
    maxResults: number,
  ): Promise<NewsItem[]> {
    const trimmed = keyword.trim();
    if (!trimmed || !this.rdtAvailable) return [];

    const limit = Math.min(maxResults, MAX_PER_SUBREDDIT);
    const items: NewsItem[] = [];

    for (const sub of this.subreddits) {
      try {
        const result = spawnSync(
          'rdt',
          ['search', trimmed, '--subreddit', sub, '--limit', String(limit), '--json'],
          { encoding: 'utf8', timeout: RDT_TIMEOUT_MS },
        );

        if (result.status !== 0) {
          logger.warn({ keyword, sub, stderr: result.stderr }, 'rdt search 失敗 — スキップ');
          continue;
        }

        const posts = parseRdtOutput(result.stdout);
        for (const post of posts) {
          if (!post.title) continue;
          const postUrl = post.permalink
            ? `https://www.reddit.com${post.permalink}`
            : (post.url ?? '');
          items.push({
            keyword,
            title: `[r/${sub}] ${post.title}`,
            url: postUrl,
            summary: (post.selftext ?? '').slice(0, 300).replace(/\s+/g, ' ').trim(),
            published: post.created_utc
              ? new Date(post.created_utc * 1000).toISOString().slice(0, 10)
              : null,
          });
        }
        logger.info({ keyword, sub, count: posts.length }, 'Reddit投稿取得完了');
      } catch (err) {
        logger.warn(
          { keyword, sub, err: err instanceof Error ? err.message : String(err) },
          'Reddit取得失敗 — スキップ',
        );
      }
    }

    return items;
  }
}

function checkRdt(): boolean {
  try {
    const result = spawnSync('rdt', ['--version'], { encoding: 'utf8' });
    return result.status === 0;
  } catch {
    return false;
  }
}
