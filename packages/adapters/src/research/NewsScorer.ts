/**
 * NewsScorer
 *
 * ニュースアイテムを鮮度・キーワード関連度・ソース信頼度・競合被り度でスコアリングする。
 */

import type { NewsItem, CompetitorVideo } from './types';

export interface ScoredNewsItem extends NewsItem {
  recencyScore: number;
  relevanceScore: number;
  trustScore: number;
  competitorOverlapPenalty: number;
  totalScore: number;
}

const HIGH_TRUST_DOMAINS = [
  'bloomberg.com',
  'reuters.com',
  'nikkei.com',
  'ft.com',
  'wsj.com',
  'apnews.com',
  // 政府・中銀の1次プレス（最高信頼）
  'federalreserve.gov',
  'boj.or.jp',
  'fsa.go.jp',
  'meti.go.jp',
];
const MED_TRUST_DOMAINS = [
  'techcrunch.com',
  'wired.com',
  'cnbc.com',
  'theverge.com',
  'arstechnica.com',
  'businessinsider.com',
  'forbes.com',
  'japantimes.co.jp',
  'scmp.com',
];

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function scoreRecency(published: string | null, today: Date): number {
  if (!published) return 2;
  const pub = new Date(published);
  const diffDays = (today.getTime() - pub.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1) return 10;
  if (diffDays < 2) return 8;
  if (diffDays < 4) return 6;
  if (diffDays < 8) return 4;
  return 2;
}

function scoreRelevance(item: NewsItem, keywords: string[]): number {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  let score = 0;
  for (const kw of keywords) {
    const words = kw.toLowerCase().split(/[\s・]+/);
    for (const word of words) {
      if (word.length < 2) continue;
      if (item.title.toLowerCase().includes(word)) score += 2;
      else if (item.summary.toLowerCase().includes(word)) score += 1;
    }
  }
  return Math.min(score, 10);
}

function scoreTrust(url: string): number {
  const domain = extractDomain(url);
  if (HIGH_TRUST_DOMAINS.some((d) => domain.endsWith(d))) return 3;
  if (MED_TRUST_DOMAINS.some((d) => domain.endsWith(d))) return 2;
  return 1;
}

function competitorOverlapPenalty(item: NewsItem, competitorVideos: CompetitorVideo[]): number {
  const itemWords = new Set(
    item.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4),
  );
  for (const video of competitorVideos) {
    const videoWords = video.title
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length >= 4);
    const overlap = videoWords.filter((w) => itemWords.has(w)).length;
    if (overlap >= 2) return 3;
  }
  return 0;
}

export class NewsScorer {
  score(items: NewsItem[], keywords: string[], competitorVideos: CompetitorVideo[]): ScoredNewsItem[] {
    const today = new Date();
    return items.map((item) => {
      const recencyScore = scoreRecency(item.published, today);
      const relevanceScore = scoreRelevance(item, keywords);
      const trustScore = scoreTrust(item.url);
      const penalty = competitorOverlapPenalty(item, competitorVideos);
      const totalScore =
        recencyScore * 0.4 +
        relevanceScore * 0.35 +
        trustScore * 0.15 -
        penalty * 0.1;
      return { ...item, recencyScore, relevanceScore, trustScore, competitorOverlapPenalty: penalty, totalScore };
    });
  }

  /** URL 重複を除去してスコア降順でソート */
  deduplicateAndSort(items: ScoredNewsItem[]): ScoredNewsItem[] {
    const seen = new Set<string>();
    const unique = items.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
    return unique.sort((a, b) => b.totalScore - a.totalScore);
  }
}
