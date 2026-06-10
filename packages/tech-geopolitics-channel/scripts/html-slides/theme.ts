/**
 * html-slides/theme.ts
 * シリーズ別テーマ定義と適用。
 * applyTheme() は C を in-place 変更するため、import 後のレンダラーに自動伝播する。
 */

import { C } from './context';

export interface SlideTheme {
  name: string;
  accent: string;
  accent2: string;
  chartPalette: [string, string, string, string, string, string];
}

const GREY_CHART_TAIL: [string, string, string, string] = ['#888888', '#B0BEC5', '#CFD8DC', '#D84315'];

// シリーズ別 accent は「朱(#D84315)と衝突しないクール系の抑制色」に統一する。
// 朱は強調キーワード/課題専用のため series accent には使わない。
export const THEMES: SlideTheme[] = [
  // monday-signal: メインブルー（デフォルト）
  { name: 'monday-signal', accent: '#1976D2', accent2: '#1565C0', chartPalette: ['#1976D2', '#90A4AE', ...GREY_CHART_TAIL] },
  // japan-only: ティール（日本にしかないシリーズ）
  { name: 'japan-only',    accent: '#00838F', accent2: '#006064', chartPalette: ['#00838F', '#90A4AE', ...GREY_CHART_TAIL] },
  // chokepoint: インディゴ（チョークポイント・地政学要衝）
  { name: 'chokepoint',    accent: '#283593', accent2: '#1A237E', chartPalette: ['#283593', '#90A4AE', ...GREY_CHART_TAIL] },
  // reverse-wind: 深紫（逆風で笑う企業）
  { name: 'reverse-wind',  accent: '#4527A0', accent2: '#311B92', chartPalette: ['#4527A0', '#90A4AE', ...GREY_CHART_TAIL] },
  // asset-defense: 濃ティール（資産防衛）
  { name: 'asset-defense', accent: '#00695C', accent2: '#004D40', chartPalette: ['#00695C', '#90A4AE', ...GREY_CHART_TAIL] },
];

/** 文字列から安定したハッシュ値を得る（同一epは常に同テーマ） */
export function stableHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** --theme 明示指定 or タイトルハッシュからシリーズテーマを解決する */
export function resolveTheme(explicitName: string | undefined, seed: string): SlideTheme {
  if (explicitName) {
    const found = THEMES.find((t) => t.name === explicitName);
    if (found) return found;
    console.warn(`[html-slides] 未知のテーマ名: ${explicitName} → タイトルハッシュにフォールバック`);
  }
  return THEMES[stableHash(seed) % THEMES.length];
}

/** 解決したテーマを C に適用する（レンダリング前に1度だけ呼ぶ） */
export function applyTheme(theme: SlideTheme): void {
  C.accent       = theme.accent;
  C.accent2      = theme.accent2;
  C.bar          = theme.accent;
  C.chartPalette = [...theme.chartPalette];
}
