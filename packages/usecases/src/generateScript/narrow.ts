/**
 * directive.yaml / winning-patterns.json の raw Record を型付き構造に narrow する。
 *
 * スキーマが欠損・不正な場合は null を返す。ゆるい型ガードなので、
 * Zod が入り次第 z.safeParse に置換する想定。
 */

import { schema } from '@money-video/domain';
import type { Directive, TopicResearch, WinningPatterns } from './ports';

export function narrowDirective(raw: Record<string, unknown> | null | undefined): Directive | null {
  if (!raw) return null;
  // tech_geopolitics 以外のキーは無視（directive.yaml には他チャンネル向けも入りうる）
  const tg = raw.tech_geopolitics;
  if (!tg || typeof tg !== 'object') return { tech_geopolitics: undefined };

  // script_rules だけは Zod で厳密検証する（高頻度調整値の SoT のため）。
  // 不正・欠損なら drop し、prompt.ts のハードコード既定値にフォールバックする。
  const tgObj = tg as Record<string, unknown>;
  const parsed = schema.ScriptRulesSchema.safeParse(tgObj.script_rules);
  const techGeo = {
    ...tgObj,
    script_rules: parsed.success ? parsed.data : undefined,
  } as Directive['tech_geopolitics'];

  return { tech_geopolitics: techGeo };
}

export function narrowTopicResearch(
  raw: Record<string, unknown> | null | undefined,
): TopicResearch | null {
  if (!raw) return null;
  if (typeof raw.researched_at !== 'string') return null;
  if (!Array.isArray(raw.competitor_videos)) return null;
  if (!Array.isArray(raw.news_items)) return null;
  return raw as unknown as TopicResearch;
}

export function narrowWinningPatterns(
  raw: Record<string, unknown> | null | undefined,
): WinningPatterns | null {
  if (!raw) return null;
  // 必須フィールドだけ最小限チェック（なければ null）
  if (typeof raw.analyzedAt !== 'string') return null;
  if (typeof raw.totalVideosAnalyzed !== 'number') return null;
  if (!Array.isArray(raw.structureInsights)) return null;
  if (!Array.isArray(raw.recommendedHooks)) return null;
  if (!Array.isArray(raw.avoidPatterns)) return null;
  if (!Array.isArray(raw.titlePatterns)) return null;
  if (!Array.isArray(raw.hookPatterns)) return null;
  return raw as unknown as WinningPatterns;
}
