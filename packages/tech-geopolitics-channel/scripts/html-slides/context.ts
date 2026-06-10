/**
 * html-slides/context.ts
 * スライド生成の共有ミュータブル状態。
 * applyTheme() が C / chartPalette を in-place 変更し、全レンダラーに伝播する。
 */

export const SLIDE_W = 1920;
export const SLIDE_H = 1080;

/** Geist Sans → Inter fallback (Google Fonts で利用可能) */
export const FONT = `'Noto Sans JP',sans-serif`;

/** コンサル品質パレット — 純白背景・6色厳守・完全フラット（2026-06 ガイド準拠） */
export const C = {
  // Backgrounds（純白。塗りでなくヘアライン罫線で領域を区切る）
  bg:        '#ffffff',
  bg2:       '#ffffff',
  card:      '#ffffff',
  // Text（純黒を避け #222222 / 補助 #888888）
  heading:   '#222222',
  text:      '#222222',
  muted:     '#888888',
  dim:       '#888888',
  // Accent — メインブルー（青の明度違いで区別）
  accent:    '#1976D2',
  accent2:   '#1565C0',
  lightFill: '#E8F4FB',   // 淡い塗り（最も強調したい1ブロックのみ）
  // Border — ヘアライン罫線
  border:    '#E0E0E0',
  // Status（緑は廃止＝青へ集約。朱はキーワード/課題/減少専用）
  red:       '#D84315',
  green:     '#1976D2',
  yellow:    '#D84315',
  // Left bar
  bar:       '#1976D2',
  // Inverse surface（純黒を避ける）
  dark:      '#222222',
  /** Chart.js カラーパレット — 先頭=強調1系列、以降グレー諸段、末尾に朱を予約（applyTheme で差し替え） */
  chartPalette: ['#1976D2', '#888888', '#B0BEC5', '#CFD8DC', '#90A4AE', '#D84315'] as string[],
};

/** スペーシングスケール — 8px grid (Marp / Slidev 準拠) */
export const SPACING = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48, section: 72 } as const;

/** セマンティックカラー — ガイドの3役割へ集約（青=注目/自社・グレー=中立・朱=課題/減少） */
export const SEMANTIC = {
  growth:  '#1976D2',  // 成長・上昇・ポジティブ → 青へ集約
  risk:    '#D84315',  // リスク・下落・ネガティブ → 朱
  neutral: '#888888',  // 中立
  us:      '#1976D2',  // 米国関連 → 青（注目/自社）
  china:   '#D84315',  // 中国関連 → 朱（課題）
  japan:   '#1976D2',  // 日本関連 → 青（注目/自社）
  yen:     '#888888',  // 円・為替関連 → グレー（中立）
  watch:   '#D84315',  // 要注目 → 朱
} as const;

/** カテゴリキーワード → 色の自動マッピング（3役割集約） */
export const CATEGORY_MAP: Record<string, string> = {
  '米国': '#1976D2', 'アメリカ': '#1976D2', 'US': '#1976D2', 'Fed': '#1976D2',
  '中国': '#D84315', 'China': '#D84315', '中共': '#D84315',
  '日本': '#1976D2', 'Japan': '#1976D2', '日銀': '#1976D2', 'BOJ': '#1976D2',
  '円': '#888888', 'JPY': '#888888', 'ドル円': '#888888',
  'リスク': '#D84315', '危機': '#D84315',
  '成長': '#1976D2', '回復': '#1976D2',
};

/** 6色パレット許容セット（clampToPalette で使用） */
export const PALETTE_OK = new Set([
  '#1976d2', '#1565c0', '#d84315', '#888888', '#e8f4fb', '#222222',
  '#e0e0e0', '#b0bec5', '#90a4ae', '#cfd8dc', '#ffffff', '#fff',
]);
