/**
 * TopicPromptFileUpdater
 *
 * TOPIC_PROPOSAL_PROMPT.md の <!-- COMPETITOR_VIDEOS_START/END --> と
 * <!-- NEWS_ITEMS_START/END --> セクションをリサーチ結果で更新する。
 */

import * as fs from 'fs';
import type { CompetitorVideo, MacroSnapshot, NewsItem, TopicResearch } from './types';

/** TopicPromptUpdater port との shape 互換を保つ */
export interface TopicPromptUpdater {
  update(promptPath: string, research: TopicResearch, dryRun: boolean): void;
}

export class TopicPromptFileUpdater implements TopicPromptUpdater {
  update(promptPath: string, research: TopicResearch, dryRun: boolean): void {
    if (!fs.existsSync(promptPath)) {
      return;
    }

    let content = fs.readFileSync(promptPath, 'utf8');

    // 競合動画セクション
    const videoLines = research.competitor_videos
      .slice(0, 30)
      .map((v) => {
        const views = v.views ? `${(v.views / 10000).toFixed(1)}万回視聴` : '';
        const date = v.published ?? '';
        return `- 【${v.channel}】${v.title}${views ? ` (${views})` : ''}${date ? ` — ${date}` : ''}`;
      })
      .join('\n');

    content = content.replace(
      /<!-- COMPETITOR_VIDEOS_START -->[\s\S]*?<!-- COMPETITOR_VIDEOS_END -->/,
      `<!-- COMPETITOR_VIDEOS_START -->\n${videoLines || '（取得できませんでした）'}\n<!-- COMPETITOR_VIDEOS_END -->`,
    );

    // ニュースセクション
    const newsLines = research.news_items
      .slice(0, 25)
      .map((n) => {
        const date = n.published ? ` — ${n.published}` : '';
        const summary = n.summary ? `\n  > ${n.summary.slice(0, 80)}...` : '';
        return `- 【${n.keyword}】${n.title}${date}${summary}`;
      })
      .join('\n');

    content = content.replace(
      /<!-- NEWS_ITEMS_START -->[\s\S]*?<!-- NEWS_ITEMS_END -->/,
      `<!-- NEWS_ITEMS_START -->\n${newsLines || '（取得できませんでした）'}\n<!-- NEWS_ITEMS_END -->`,
    );

    // マクロ1次データセクション（マーカーがある場合のみ置換。無ければ no-op）
    content = content.replace(
      /<!-- MACRO_SNAPSHOT_START -->[\s\S]*?<!-- MACRO_SNAPSHOT_END -->/,
      `<!-- MACRO_SNAPSHOT_START -->\n${formatMacroBlock(research.macro_snapshot)}\n<!-- MACRO_SNAPSHOT_END -->`,
    );

    if (!dryRun) {
      fs.writeFileSync(promptPath, content, 'utf8');
    }
  }
}

function formatMacroBlock(macro: MacroSnapshot | null | undefined): string {
  if (!macro) return '（取得できませんでした）';
  const asOf = macro.as_of ? `（${macro.as_of} 時点 / ${macro.source}）` : `（${macro.source}）`;
  const usd = macro.fx.usd_jpy != null ? `USD/JPY: ${macro.fx.usd_jpy}` : 'USD/JPY: —';
  const eur = macro.fx.eur_jpy != null ? `EUR/JPY: ${macro.fx.eur_jpy}` : 'EUR/JPY: —';
  return `- ${usd}\n- ${eur}\n  > 1次データ ${asOf}。提案では実数値を使った独自試算・自分ごと化を促すこと。`;
}
