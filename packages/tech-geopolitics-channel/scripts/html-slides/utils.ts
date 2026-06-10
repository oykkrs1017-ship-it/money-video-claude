/**
 * html-slides/utils.ts
 * HTML生成ユーティリティ — エスケープ・フォーマット・基底テンプレート。
 */

import { C, FONT, SLIDE_W, SLIDE_H, SPACING, SEMANTIC, CATEGORY_MAP, PALETTE_OK } from './context';

export { SPACING, SEMANTIC };

// ─── HTML エスケープ ──────────────────────────────────────────────────────────

export function escHtml(s: unknown): string {
  const str = (typeof s === 'object' && s !== null && 'text' in s)
    ? String((s as {text: unknown}).text ?? '')
    : String(s ?? '');
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function pointText(p: unknown): string {
  if (typeof p === 'string') return p;
  if (typeof p === 'object' && p !== null) return String((p as {text?: unknown}).text ?? '');
  return String(p ?? '');
}

// ─── カラークランプ ───────────────────────────────────────────────────────────

/**
 * 任意の色を6色パレットの役割色へ丸める（ガイド「6色厳守」を入力に依らず強制）。
 * 赤/橙/マゼンタ→朱(#D84315・課題/減少)、黄/金/低彩度→グレー(#888888・中立)、緑/青/紫→ブルー(#1976D2・注目)。
 * パレット内の色・グレー諸段はそのまま通す。
 */
export function clampToPalette(input: string | undefined): string | undefined {
  if (!input) return input;
  const v = input.trim().toLowerCase();
  if (PALETTE_OK.has(v)) return input;
  if (!v.startsWith('#')) return C.accent;
  const hx = v.slice(1);
  const h6 = hx.length === 3 ? hx.split('').map((c) => c + c).join('') : hx;
  if (h6.length !== 6 || /[^0-9a-f]/.test(h6)) return C.accent;
  const r = parseInt(h6.slice(0, 2), 16);
  const g = parseInt(h6.slice(2, 4), 16);
  const b = parseInt(h6.slice(4, 6), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d < 30) return '#888888';
  let hue: number;
  if (max === r) hue = ((g - b) / d) % 6;
  else if (max === g) hue = (b - r) / d + 2;
  else hue = (r - g) / d + 4;
  hue = (hue * 60 + 360) % 360;
  if (hue < 45 || hue >= 320) return '#D84315';
  if (hue < 70) return '#888888';
  return C.accent;
}

// ─── セマンティックカラー ─────────────────────────────────────────────────────

/** キーワードを含む文字列からセマンティックカラーを解決する */
export function resolveColor(text: string, fallback: string): string {
  for (const [kw, col] of Object.entries(CATEGORY_MAP)) {
    if (text.includes(kw)) return col;
  }
  return fallback;
}

// ─── 数値フォーマット ─────────────────────────────────────────────────────────

/** トレンド指標: +12.3% ↑（緑） / −5.7% ↓（赤） / ±0（グレー） */
export function fmtTrend(value: number, unit = '%'): string {
  if (value === 0) return `<span style="color:${SEMANTIC.neutral}">±0${unit}</span>`;
  const sign  = value > 0 ? '+' : '';
  const arrow = value > 0 ? ' ↑' : ' ↓';
  const color = value > 0 ? SEMANTIC.growth : SEMANTIC.risk;
  const abs   = Math.abs(value).toFixed(1);
  return `<span style="color:${color};font-weight:700">${sign}${abs}${unit}${arrow}</span>`;
}

/** 日本語大数フォーマット: 1_500_000 → "150万" / 1_000_000_000_000 → "1兆" */
export function fmtJP(value: number, unit = ''): string {
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(1)}兆${unit}`;
  if (value >= 100_000_000)       return `${(value / 100_000_000).toFixed(0)}億${unit}`;
  if (value >= 10_000)            return `${(value / 10_000).toFixed(0)}万${unit}`;
  return `${value.toLocaleString('ja-JP')}${unit}`;
}

/** パーセントフォーマット: 0.153 → "15.3%" */
export function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ─── バッジ ───────────────────────────────────────────────────────────────────

/** バッジ HTML: 'key'|'risk'|'new'|'watch' → 色付きチップ */
export function renderBadge(badge: string): string {
  const MAP: Record<string, {label: string; color: string}> = {
    key:   { label: 'KEY',   color: SEMANTIC.us },
    risk:  { label: 'リスク', color: SEMANTIC.risk },
    new:   { label: 'NEW',   color: SEMANTIC.japan },
    watch: { label: '注目',  color: SEMANTIC.watch },
  };
  const b = MAP[badge] ?? { label: badge.toUpperCase(), color: SEMANTIC.neutral };
  return `<span style="display:inline-block;background:${b.color};color:#fff;font-size:11px;font-weight:800;padding:2px 8px;border-radius:3px;letter-spacing:1px;margin-right:8px;vertical-align:middle;flex-shrink:0">${b.label}</span>`;
}

// ─── HTML 基底テンプレート ────────────────────────────────────────────────────

export function baseHtml(title: string, body: string, extraHead = ''): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+JP:wght@400;500;700;900&family=Noto+Serif+JP:wght@400;500;700;900&display=swap" rel="stylesheet">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
${extraHead}
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{
  width:${SLIDE_W}px;height:${SLIDE_H}px;overflow:hidden;
  background:${C.bg};
  font-family:${FONT};
  font-weight:700;
  color:${C.text};
  -webkit-font-smoothing:antialiased;
  word-break:auto-phrase;
  overflow-wrap:break-word;
}
.slide{width:${SLIDE_W}px;height:${SLIDE_H}px;position:relative;overflow:hidden}

/* フラットカード — 白地＋ヘアライン罫線（影なし） */
.v-card{
  background:#ffffff;
  border:1px solid ${C.border};
  border-radius:8px;
}

/* Left accent bar (Vercel Develop Blue) */
.accent-bar{
  position:absolute;left:0;top:0;
  width:8px;height:${SLIDE_H}px;
  background:${C.bar};
}

/* Slide title */
.slide-h1{
  font-size:56px;font-weight:700;
  color:${C.heading};
  letter-spacing:-1.5px;
  line-height:1.15;
}
.slide-h2{
  font-size:44px;font-weight:700;
  color:${C.heading};
  letter-spacing:-1px;
  line-height:1.2;
}
.accent-line{
  width:56px;height:4px;
  background:${C.accent};
  border-radius:2px;margin-top:12px;margin-bottom:32px;
}

/* Section tag */
.section-tag{
  display:inline-block;
  background:${C.accent};
  color:#fff;
  font-size:18px;font-weight:700;
  padding:6px 18px;border-radius:6px;
  letter-spacing:0.5px;margin-bottom:20px;
}
</style>
</head>
<body>
<div class="slide">
  <div class="accent-bar"></div>
  ${body}
</div>
</body>
</html>`;
}
