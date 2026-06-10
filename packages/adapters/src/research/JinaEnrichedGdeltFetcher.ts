/**
 * JinaEnrichedGdeltFetcher
 *
 * GdeltNewsFetcher の結果に Jina Reader（https://r.jina.ai/）で記事本文を付与するラッパー。
 * Jina Reader は APIキー不要・無料。GDELT のサマリは「domain / country」のみで内容が薄いため、
 * 実際の記事テキストに置き換えることで台本生成 LLM へ渡す情報量を大幅に改善する。
 *
 * - Exa に頼らず全文情報を得られる（コスト削減）
 * - Jina 取得失敗時は元の GDELT サマリを維持（パイプラインを止めない）
 * - 順次処理でレートリミットを回避（1件ごとに小さなディレイ）
 */

import { createLogger } from '@money-video/shared-ts';
import { httpGetText } from './httpGetJson';
import { GdeltNewsFetcher } from './GdeltNewsFetcher';
import type { NewsItem } from './types';

const logger = createLogger({ name: 'JinaEnrichedGdeltFetcher', level: 'info' });

const JINA_BASE = 'https://r.jina.ai/';
const MAX_SUMMARY_CHARS = 1500;
const JINA_DELAY_MS = 300;

/** NewsFetcher port との shape 互換を保つ */
export interface NewsFetcher {
  isAvailable(): boolean;
  searchByKeyword(keyword: string, lookbackDays: number, maxResults: number): Promise<NewsItem[]>;
}

export class JinaEnrichedGdeltFetcher implements NewsFetcher {
  private readonly gdelt: GdeltNewsFetcher;

  constructor(gdelt = new GdeltNewsFetcher()) {
    this.gdelt = gdelt;
  }

  isAvailable(): boolean {
    return this.gdelt.isAvailable();
  }

  async searchByKeyword(
    keyword: string,
    lookbackDays: number,
    maxResults: number,
  ): Promise<NewsItem[]> {
    const items = await this.gdelt.searchByKeyword(keyword, lookbackDays, maxResults);
    const enriched: NewsItem[] = [];

    for (const item of items) {
      let summary = item.summary;
      try {
        const text = await httpGetText(`${JINA_BASE}${item.url}`);
        summary = text
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, MAX_SUMMARY_CHARS);
      } catch (err) {
        logger.warn(
          { url: item.url, err: err instanceof Error ? err.message : String(err) },
          'Jina取得失敗 — 元サマリを維持',
        );
      }
      enriched.push({ ...item, summary });
      await delay(JINA_DELAY_MS);
    }

    logger.info({ keyword, count: enriched.length }, 'Jina記事本文付与完了');
    return enriched;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
