/**
 * generate-html-slides.ts
 * DESIGN.md (Vercel-inspired) に基づくHTMLスライド生成
 * script-input.json → HTML (1枚/ファイル) + PNG エクスポート
 *
 * 使い方:
 *   npm run html:generate [-- --input ./input/script-input.json]
 *
 * 出力:
 *   out/html-slides/
 *     index.html    ← iframe一覧プレビュー
 *     slide-001.html ...
 *     png/slide-001.png ...
 */

import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

// ─── DESIGN.md トークン (Vercel-inspired × 解説動画用調整) ───────────────────

const SLIDE_W = 1920;
const SLIDE_H = 1080;

/** ライトテーマ — 白背景・ネイビーテキスト・ブルーアクセント */
const C = {
  // Backgrounds
  bg:      '#ffffff',
  bg2:     '#fafafa',   // Vercel Gray50
  card:    '#f5f5f5',   // Vercel Gray50 + saturation
  // Text — Vercel typography principle (not pure black)
  heading: '#171717',   // Vercel Black
  text:    '#1a1a1a',
  muted:   '#4d4d4d',   // Vercel Gray600
  dim:     '#808080',   // Vercel Gray400
  // Accent — Vercel Develop Blue
  accent:  '#0a72ef',
  accent2: '#0057c2',
  // Border — Vercel shadow-as-border
  border:  'rgba(0,0,0,0.10)',
  // Status
  red:     '#e53e3e',
  green:   '#1a7f4b',
  yellow:  '#c05621',
  // Left bar
  bar:     '#0a72ef',
  // Inverse surface (dark sections)
  dark:    '#171717',
};

/** Geist Sans → Inter fallback (Google Fonts で利用可能) */
const FONT = `'Inter','Noto Sans JP',sans-serif`;

/** Chart.js カラーパレット (ライトテーマ用) */
const CHART_PALETTE = [
  '#0a72ef', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2',
];

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface StatVisual    { type:'stat';   value:string; label:string; unit?:string; description?:string; }
interface ChartVisual   { type:'chart';  key:string; insight?:string; }
interface RichPanel     { type:'rich-panel'; title:string; points:Array<string|{title:string;detail:string}>; body?:string; }
interface TimelineVis   { type:'timeline'; events:Array<{year:string;label:string;highlight?:boolean}>; }
interface CompTableVis  { type:'comparison-table'; title?:string; columns:Array<string|{label:string;winner?:boolean}>; rows:Array<{label:string;values:string[]}>; }
interface FlowChart     { type:'flow-chart'; title?:string; root?:{label:string;children?:Array<{label:string;sublabel?:string}>}; steps?:Array<{title:string;description?:string}>; }
interface ImageVisual   { type:'image'; caption?:string; }
type Visual = StatVisual|ChartVisual|RichPanel|TimelineVis|CompTableVis|FlowChart|ImageVisual;

interface ScriptLine { speaker:string; text:string; visual?:Visual; }
interface Chapter    { type:string; topic?:string; lines:ScriptLine[]; }
interface ChartEntry { data:Array<{label:string;value:number}>; title?:string; chartType?:string; }
interface ScriptInput { videoId:string; title:string; description?:string; chapters:Chapter[]; chartData?:Record<string,ChartEntry>; }
interface SlideDef   { title:string; section:string; layout:string; data:Record<string,unknown>; chartData?:ChartEntry; }

// ─── HTML 基底テンプレート ────────────────────────────────────────────────────

function baseHtml(title: string, body: string, extraHead = ''): string {
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
  color:${C.text};
  -webkit-font-smoothing:antialiased;
}
.slide{width:${SLIDE_W}px;height:${SLIDE_H}px;position:relative;overflow:hidden}

/* Vercel shadow-as-border card */
.v-card{
  background:${C.bg2};
  box-shadow:0 0 0 1px ${C.border}, 0 2px 4px rgba(0,0,0,0.04);
  border-radius:12px;
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
  font-size:18px;font-weight:600;
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

// ─── レイアウト実装 ───────────────────────────────────────────────────────────

/** カバースライド */
function renderCover(def: SlideDef): string {
  const body = `
  <!-- 右上装飾グリッド -->
  <div style="position:absolute;right:0;top:0;width:480px;height:480px;opacity:0.04">
    <svg width="480" height="480" viewBox="0 0 480 480">
      ${Array.from({length:6}).map((_,r)=>Array.from({length:6}).map((_,c)=>`<rect x="${c*80+1}" y="${r*80+1}" width="78" height="78" rx="4" fill="${C.accent}"/>`).join('')).join('')}
    </svg>
  </div>

  <div style="position:absolute;top:50%;left:72px;right:160px;transform:translateY(-50%)">
    ${def.section ? `<div class="section-tag">${escHtml(def.section)}</div>` : ''}
    <div style="font-size:76px;font-weight:800;color:${C.heading};line-height:1.15;letter-spacing:-2.5px;margin-bottom:28px;margin-top:${def.section ? 16 : 0}px">
      ${escHtml(def.title)}
    </div>
    <div style="width:72px;height:5px;background:${C.accent};border-radius:3px;margin-bottom:32px"></div>
    <div style="font-size:28px;color:${C.muted};line-height:1.55;max-width:1100px">
      ${escHtml(String(def.data.subtitle ?? ''))}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** セクション区切り */
function renderSection(def: SlideDef): string {
  const num = String(def.data.num ?? '');
  const titleLen = def.title.length;
  const titleFS = titleLen > 20 ? 80 : titleLen > 14 ? 96 : 112;
  const body = `
  <!-- 大番号装飾 (右下に移動して上部空白を削減) -->
  <div style="position:absolute;right:40px;bottom:-80px;font-size:480px;font-weight:900;color:rgba(10,114,239,0.05);line-height:1;letter-spacing:-12px;user-select:none">
    ${num.padStart(2,'0')}
  </div>
  <!-- 左側アクセントライン -->
  <div style="position:absolute;left:80px;top:120px;bottom:120px;width:6px;background:linear-gradient(to bottom,${C.accent},${C.accent}40);border-radius:3px"></div>
  <!-- コンテンツ: 上1/3に配置 -->
  <div style="position:absolute;top:120px;left:128px;right:120px">
    <div class="section-tag">${escHtml(def.section)}</div>
    <div style="font-size:${titleFS}px;font-weight:800;color:${C.heading};line-height:1.1;letter-spacing:-3px;margin-top:24px;margin-bottom:32px;max-width:1400px">
      ${escHtml(def.title)}
    </div>
    <div style="width:80px;height:6px;background:${C.accent};border-radius:3px"></div>
    <div style="margin-top:48px;font-size:28px;color:${C.muted};font-weight:400;line-height:1.5">
      Chapter ${num.padStart(2,'0')}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** 目次（アジェンダ）スライド */
function renderToc(def: SlideDef): string {
  const chapters: Array<{num:number;topic:string}> =
    Array.isArray(def.data.chapters) ? def.data.chapters as Array<{num:number;topic:string}> : [];
  const n = chapters.length;
  const accentColors = [C.accent,'#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#0e7490'];
  const itemFS = n <= 4 ? 34 : n <= 6 ? 28 : 24;

  const items = chapters.map((ch, i) => {
    const color = accentColors[i % accentColors.length];
    return `
    <div style="display:flex;align-items:center;gap:28px;padding:20px 32px;background:${C.bg2};border-radius:12px;box-shadow:0 0 0 1px ${C.border};flex:1">
      <div style="flex-shrink:0;width:52px;height:52px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center">
        <span style="font-size:22px;font-weight:800;color:#fff">${ch.num}</span>
      </div>
      <div style="font-size:${itemFS}px;font-weight:600;color:${C.heading};line-height:1.35">${escHtml(ch.topic)}</div>
    </div>`;
  }).join('');

  const cols = n > 5 ? 2 : 1;
  const gridStyle = cols === 2
    ? `display:grid;grid-template-columns:repeat(2,1fr);gap:20px`
    : `display:flex;flex-direction:column;gap:20px`;

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:48px;${gridStyle}">
    ${items}
  </div>`;
  return baseHtml(def.title, body);
}

/** 大数値ヒーロー */
function renderStat(def: SlideDef): string {
  const stats: Array<{value:string;label:string;unit?:string;color?:string}> =
    Array.isArray(def.data.stats) ? def.data.stats as typeof stats : [];
  const n = stats.length;

  if (n <= 1) {
    const s = stats[0] ?? {value:'', label:def.title};
    const description = String(def.data.description ?? '');
    const body = `
    <!-- 右装飾サークル -->
    <div style="position:absolute;right:-80px;bottom:-80px;width:560px;height:560px;border-radius:50%;background:${C.accent};opacity:0.05"></div>
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:0 80px">
      <div style="font-size:220px;font-weight:900;color:${C.accent};line-height:1;letter-spacing:-6px">${escHtml(s.value)}</div>
      ${s.unit ? `<div style="font-size:36px;color:${C.muted};margin-top:-12px">${escHtml(s.unit)}</div>` : ''}
      <div style="width:80px;height:4px;background:${C.accent};border-radius:2px"></div>
      <div style="font-size:34px;color:${C.heading};text-align:center;max-width:1400px;font-weight:600;line-height:1.4">${escHtml(s.label)}</div>
      ${description ? `<div style="font-size:26px;color:${C.muted};text-align:center;max-width:1200px;line-height:1.65;font-family:'Noto Sans JP',sans-serif">${escHtml(description)}</div>` : ''}
    </div>`;
    return baseHtml(def.title, body);
  }

  // 複数stat: グリッドカード
  const cols = n <= 2 ? n : Math.min(n, 4);
  const cards = stats.map(s => `
    <div class="v-card" style="flex:1;padding:56px 40px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;text-align:center">
      <div style="font-size:${cols <= 2 ? 120 : 88}px;font-weight:900;color:${s.color ?? C.accent};line-height:1;letter-spacing:-3px">${escHtml(s.value)}</div>
      ${s.unit ? `<div style="font-size:22px;color:${C.muted}">${escHtml(s.unit)}</div>` : ''}
      <div style="width:40px;height:3px;background:${s.color ?? C.accent};border-radius:2px"></div>
      <div style="font-size:22px;color:${C.muted};font-weight:500;line-height:1.4">${escHtml(s.label)}</div>
    </div>`).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:56px;display:flex;gap:32px">
    ${cards}
  </div>`;
  return baseHtml(def.title, body);
}

/** Chart.js グラフ */
function renderChart(def: SlideDef): string {
  const cd = def.chartData;
  if (!cd) return renderStat(def);

  const labels  = cd.data.map(d => d.label);
  const values  = cd.data.map(d => d.value);
  const max     = Math.max(...values);
  const type    = cd.chartType === 'line' ? 'line' : 'bar';

  const chartCfg = JSON.stringify({
    type,
    data: {
      labels,
      datasets: [{
        label: cd.title ?? '',
        data: values,
        backgroundColor: type === 'bar'
          ? values.map(v => v === max ? C.accent : 'rgba(10,114,239,0.25)')
          : 'rgba(10,114,239,0.08)',
        borderColor: type === 'line' ? C.accent : values.map(v => v === max ? C.accent2 : C.accent),
        borderWidth: type === 'line' ? 3 : 0,
        borderRadius: type === 'bar' ? 6 : 0,
        pointBackgroundColor: C.accent,
        pointRadius: type === 'line' ? 7 : 0,
        pointHoverRadius: 10,
        tension: 0.4,
        fill: type === 'line',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: C.dark,
          titleColor: '#fff',
          bodyColor: '#ccc',
          padding: 14,
          cornerRadius: 8,
          titleFont: { size: 16, weight: '600' },
          bodyFont: { size: 15 },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: C.muted, font: { size: 18, family: 'Inter, Noto Sans JP' } },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: C.muted, font: { size: 18, family: 'Inter, Noto Sans JP' } },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
      },
    },
  });

  const insightText = String(def.data.insight ?? '');
  const canvasBottom = insightText ? 180 : 60;

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(cd.title ?? def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:${canvasBottom}px">
    <canvas id="chart"></canvas>
  </div>
  ${insightText ? `
  <div style="position:absolute;left:72px;right:72px;bottom:48px;height:112px;background:rgba(10,114,239,0.04);border:1px solid rgba(10,114,239,0.15);border-left:4px solid ${C.accent};border-radius:8px;padding:0 36px;display:flex;align-items:center;gap:28px">
    <div style="font-size:11px;font-weight:800;color:${C.accent};letter-spacing:3px;white-space:nowrap">KEY<br>INSIGHT</div>
    <div style="width:1px;align-self:stretch;background:rgba(10,114,239,0.2);flex-shrink:0;margin:20px 0"></div>
    <div style="font-size:26px;color:${C.heading};line-height:1.55;font-family:'Noto Sans JP',sans-serif;font-weight:500;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(insightText)}</div>
  </div>` : ''}
  <script>
    window.addEventListener('load',()=>{
      const ctx=document.getElementById('chart').getContext('2d');
      new Chart(ctx,${chartCfg});
    });
  </script>`;
  return baseHtml(def.title, body);
}

/** チャート＋右インサイトパネル (2カラム) */
function renderChartInsight(def: SlideDef): string {
  const cd = def.chartData;
  if (!cd) return renderChart(def);

  const labels  = cd.data.map(d => d.label);
  const values  = cd.data.map(d => d.value);
  const max     = Math.max(...values);
  const type    = cd.chartType === 'line' ? 'line' : 'bar';
  const insight = String(def.data.insight ?? '');

  const chartCfg = JSON.stringify({
    type,
    data: {
      labels,
      datasets: [{
        label: cd.title ?? '',
        data: values,
        backgroundColor: type === 'bar'
          ? values.map(v => v === max ? C.accent : 'rgba(10,114,239,0.25)')
          : 'rgba(10,114,239,0.08)',
        borderColor: type === 'line' ? C.accent : values.map(v => v === max ? C.accent2 : C.accent),
        borderWidth: type === 'line' ? 3 : 0,
        borderRadius: type === 'bar' ? 6 : 0,
        pointBackgroundColor: C.accent,
        pointRadius: type === 'line' ? 7 : 0,
        pointHoverRadius: 10,
        tension: 0.4,
        fill: type === 'line',
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: C.dark,
          titleColor: '#fff',
          bodyColor: '#ccc',
          padding: 14,
          cornerRadius: 8,
          titleFont: { size: 16, weight: '600' },
          bodyFont: { size: 15 },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: C.muted, font: { size: 16, family: 'Inter, Noto Sans JP' } },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: C.muted, font: { size: 16, family: 'Inter, Noto Sans JP' } },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
      },
    },
  });

  // 左: チャート (約62%), 右: インサイトパネル (約35%), gap:40px
  // content area = 1920 - 72 - 72 = 1776px
  // panel width = 580px, gap = 40px → chart right edge = 1920 - 72 - 580 - 40 = 1228px
  const panelW = 580;
  const gapX   = 40;
  const chartRight = SLIDE_W - 72 - panelW - gapX;  // 1228px from left

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(cd.title ?? def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <!-- 左: チャート -->
  <div style="position:absolute;left:72px;right:${SLIDE_W - chartRight}px;top:200px;bottom:60px">
    <canvas id="chart"></canvas>
  </div>
  <!-- 右: インサイトパネル -->
  <div style="position:absolute;right:72px;width:${panelW}px;top:200px;bottom:60px;display:flex;flex-direction:column;justify-content:center;gap:24px;padding:48px 44px;background:rgba(10,114,239,0.04);border:1px solid rgba(10,114,239,0.14);border-left:4px solid ${C.accent};border-radius:12px">
    <div style="font-size:11px;font-weight:800;color:${C.accent};letter-spacing:3px;margin-bottom:4px">KEY INSIGHT</div>
    <div style="width:40px;height:2px;background:${C.accent};border-radius:1px"></div>
    <div style="font-size:26px;color:${C.heading};line-height:1.7;font-family:'Noto Sans JP',sans-serif;font-weight:500">${escHtml(insight)}</div>
  </div>
  <script>
    window.addEventListener('load',()=>{
      const ctx=document.getElementById('chart').getContext('2d');
      new Chart(ctx,${chartCfg});
    });
  </script>`;
  return baseHtml(def.title, body);
}

/** 番号付きポイントカード */
function renderRichPanel(def: SlideDef): string {
  type RichPoint = string | { text?: string; value?: string; unit?: string; body?: string; source?: string };
  const rawPoints: RichPoint[] = Array.isArray(def.data.points) ? def.data.points as RichPoint[] : [];
  // オブジェクト形式と文字列形式の両方をサポート
  const items = rawPoints.map(p => typeof p === 'string' ? { text: p } : p as Exclude<RichPoint, string>);
  const n = items.length;
  const COLORS = ['#0a72ef','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];
  const titleFS = def.title.length > 22 ? 48 : 56;

  if (n <= 4) {
    // ── 少アイテム: フル幅行、McKinsey 01/02 番号ラベル ──────────────────────
    const textSize = n <= 2 ? 54 : n === 3 ? 42 : 34;
    const rowGap   = n <= 2 ? 28 : 20;

    const rows = items.map((p, i) => {
      const color = COLORS[i % COLORS.length];
      const numLabel = String(i + 1).padStart(2, '0');
      const label = escHtml(p.text ?? '');
      const valHtml = p.value ? `<div style="font-size:28px;font-weight:800;color:${color};font-family:'Inter',sans-serif;white-space:nowrap">${escHtml(p.value)}${p.unit ? `<span style="font-size:16px;margin-left:4px">${escHtml(p.unit)}</span>` : ''}</div>` : '';
      const bodyFS2 = n <= 2 ? 26 : n === 3 ? 22 : 20;
      const bodyHtml = p.body ? `<div style="font-size:${bodyFS2}px;color:${C.muted};margin-top:10px;line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(p.body)}</div>` : '';
      return `
      <div style="flex:1;display:flex;align-items:stretch;border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-left:3px solid ${color};border-radius:2px;background:#fafafa;overflow:hidden">
        <!-- 番号ラベル列 -->
        <div style="flex-shrink:0;width:88px;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(0,0,0,0.10)">
          <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Inter',sans-serif">${numLabel}</div>
        </div>
        <!-- テキスト -->
        <div style="flex:1;padding:0 40px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:${textSize}px;font-weight:700;color:${C.heading};line-height:1.45;font-family:'Noto Serif JP',serif">${label}</div>
          ${bodyHtml}
        </div>
        ${valHtml ? `<div style="flex-shrink:0;padding:0 32px;display:flex;align-items:center;border-left:1px solid rgba(0,0,0,0.08)">${valHtml}</div>` : ''}
      </div>`;
    }).join('');

    const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:flex;flex-direction:column;gap:${rowGap}px">
    ${rows}
  </div>`;
    return baseHtml(def.title, body);
  }

  // ── 多アイテム: 2列グリッドカード ─────────────────────────────────────────
  const cols = 2;
  const rows2 = Math.ceil(n / cols);
  const fontSize = n <= 6 ? 24 : 20;

  const cards = items.map((p, i) => {
    const color = COLORS[i % COLORS.length];
    const numLabel = String(i + 1).padStart(2, '0');
    const label = escHtml(p.text ?? '');
    const valHtml = p.value ? `<span style="font-size:18px;font-weight:800;color:${color};font-family:'Inter',sans-serif">${escHtml(p.value)}${p.unit ? p.unit : ''}</span>` : '';
    const bodyHtml = p.body ? `<div style="font-size:${n <= 6 ? 18 : 16}px;color:${C.muted};margin-top:6px;line-height:1.5;font-family:'Noto Sans JP',sans-serif">${escHtml(p.body)}</div>` : '';
    return `
    <div style="border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-radius:2px;background:#fafafa;padding:20px 28px;display:flex;align-items:flex-start;gap:20px">
      <div style="flex-shrink:0;font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Inter',sans-serif;min-width:28px;padding-top:3px">${numLabel}</div>
      <div style="width:1px;min-height:36px;background:rgba(0,0,0,0.10);flex-shrink:0;align-self:stretch"></div>
      <div style="flex:1">
        <div style="font-size:${fontSize}px;font-weight:700;color:${C.heading};line-height:1.5;font-family:'Noto Serif JP',serif">${label}${valHtml ? ' ' + valHtml : ''}</div>
        ${bodyHtml}
      </div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows2},1fr);gap:12px">
    ${cards}
  </div>`;
  return baseHtml(def.title, body);
}

/** タイムライン */
function renderTimeline(def: SlideDef): string {
  const events: Array<{year:string;label:string;highlight?:boolean}> =
    Array.isArray(def.data.events) ? def.data.events as typeof events : [];
  const n = events.length;

  // 2列グリッドで縦表示
  const cols = Math.min(n, 2);

  const evFontSize = n <= 4 ? 48 : n <= 6 ? 38 : 28;
  const titleFS = def.title.length > 22 ? 48 : 56;

  const cards = events.map((e) => {
    const highlight = !!e.highlight;
    const topColor  = highlight ? C.accent : '#808080';
    return `
    <div style="border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${topColor};border-radius:2px;background:#fafafa;padding:20px 28px;display:flex;flex-direction:column;justify-content:center">
      <div style="font-size:13px;font-weight:700;color:${topColor};letter-spacing:3px;font-family:'Inter',sans-serif;margin-bottom:10px;text-transform:uppercase">${escHtml(e.year)}</div>
      <div style="height:1px;background:rgba(0,0,0,0.10);margin-bottom:14px"></div>
      <div style="font-size:${evFontSize}px;font-weight:700;color:${highlight ? C.heading : C.muted};line-height:1.38;font-family:'Noto Serif JP',serif">${escHtml(e.label)}</div>
    </div>`;
  }).join('');

  const gridCss = `display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:1fr;gap:12px`;

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;${gridCss}">
    ${cards}
  </div>`;
  return baseHtml(def.title, body);
}

/** 比較テーブル */
function renderTable(def: SlideDef): string {
  const cols: string[] = Array.isArray(def.data.columns) ? def.data.columns as string[] : [];
  const rows: Array<{label:string;values:string[]}> =
    Array.isArray(def.data.rows) ? def.data.rows as typeof rows : [];

  // 行高: コンテンツ領域を均等分割 (top:200→bottom:48 = 832px)
  const contentH = SLIDE_H - 200 - 48;
  const totalRows = rows.length + 1;  // データ行 + ヘッダー行
  const rowH     = Math.floor(contentH / totalRows);
  // フォントサイズ: 行高に応じてスケール (行高の25%程度)
  const bodyFS   = Math.max(20, Math.min(36, Math.floor(rowH * 0.3)));
  const thStyle  = `background:${C.dark};color:#fff;font-size:${bodyFS + 2}px;font-weight:700;padding:0 32px;text-align:center;letter-spacing:-0.3px;height:${rowH}px`;
  const labelStyle = `background:${C.accent};color:#fff;font-size:${bodyFS}px;font-weight:700;padding:0 28px;border-bottom:1px solid rgba(0,0,0,0.06);vertical-align:middle;height:${rowH}px`;
  const minRowH  = rowH;
  const tdBase   = `font-size:${bodyFS}px;color:${C.text};padding:0 28px;text-align:center;border-bottom:1px solid rgba(0,0,0,0.06);vertical-align:middle;height:${minRowH}px`;

  const header   = `<tr><th style="${thStyle}">項目</th>${cols.map(c=>`<th style="${thStyle}">${escHtml(c)}</th>`).join('')}</tr>`;
  const bodyRows = rows.map((r,ri) => {
    const bg = ri % 2 === 1 ? `background:${C.card};` : '';
    return `<tr>
      <td style="${labelStyle}">${escHtml(r.label)}</td>
      ${(r.values||[]).map(v=>{
        const good = v==='○'||v==='◎'||v==='o';
        const bad  = v==='×'||v==='x';
        return `<td style="${tdBase}${bg}color:${good?C.green:bad?C.red:C.text};font-weight:${good||bad?700:400}">${escHtml(v)}</td>`;
      }).join('')}
    </tr>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title || '比較')}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:48px;overflow:hidden;border-radius:12px;box-shadow:0 0 0 1px ${C.border}">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <thead>${header}</thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
  return baseHtml(def.title || '比較', body);
}

/** 放射状スプレッド */
function renderRadial(def: SlideDef): string {
  const center = String(def.data.center ?? '');
  const items: Array<{label:string}> =
    Array.isArray(def.data.items) ? def.data.items as typeof items : [];
  const n = items.length;

  const rows = Math.ceil(n / 2);
  const accentColors = [C.accent,'#7c3aed','#059669','#d97706','#dc2626','#0891b2'];
  const cardFS = n <= 2 ? 72 : n <= 3 ? 52 : n <= 5 ? 40 : 30;
  const barH  = n <= 2 ? 120 : n <= 3 ? 90 : n <= 5 ? 70 : 56;

  const cards = items.map((item,i) => {
    const color = accentColors[i % accentColors.length];
    const isLastOdd = (i === n - 1) && (n % 2 === 1);
    const spanStyle = isLastOdd ? 'grid-column:1/span 2;' : '';
    return `
    <div class="v-card" style="${spanStyle}padding:32px 40px;display:flex;align-items:center;gap:32px;min-height:0">
      <div style="width:12px;height:${barH}px;background:${color};border-radius:3px;flex-shrink:0"></div>
      <div style="font-size:${cardFS}px;font-weight:700;color:${C.heading};line-height:1.35">${escHtml(item.label)}</div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <!-- 中心キーワード -->
  <div style="position:absolute;left:72px;top:195px;right:72px;display:flex;align-items:stretch;gap:48px;bottom:48px">
    <div style="flex-shrink:0;width:280px;display:flex;align-items:center;justify-content:center">
      <div style="width:260px;height:260px;border-radius:50%;background:${C.accent};display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;box-shadow:0 0 0 12px rgba(10,114,239,0.12)">
        <div style="font-size:28px;font-weight:800;color:#fff;text-align:center;padding:20px;line-height:1.3">${escHtml(center)}</div>
      </div>
    </div>
    <div style="flex:1;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(${rows},1fr);gap:20px">
      ${cards}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** ステップフロー */
function renderStepFlow(def: SlideDef): string {
  const steps: Array<{title:string;description?:string}> =
    Array.isArray(def.data.steps) ? def.data.steps as typeof steps : [];
  const n = steps.length;

  const COLORS = ['#0a72ef','#7c3aed','#059669','#d97706','#dc2626'];
  const titleFS = def.title.length > 22 ? 48 : 56;

  // 縦積みフロー — 角丸バッジ(border-radius:4px) + ヘアラインカード
  const cards = steps.map((s, i) => {
    const color = COLORS[i % COLORS.length];
    const numLabel = String(i + 1).padStart(2, '0');
    const isLast = i === n - 1;
    return `
    <div style="display:flex;gap:24px;flex:1;min-height:0">
      <!-- 番号バッジ＋コネクタライン -->
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
        <div style="width:48px;height:48px;border-radius:4px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:2px;font-family:'Inter',sans-serif">${numLabel}</span>
        </div>
        ${!isLast ? `<div style="flex:1;width:2px;background:rgba(0,0,0,0.10);margin-top:8px"></div>` : ''}
      </div>
      <!-- ヘアラインカード -->
      <div style="flex:1;border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-radius:2px;background:#fafafa;padding:22px 32px;margin-bottom:${isLast?0:16}px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:${n>4?22:26}px;font-weight:700;color:${C.heading};margin-bottom:${s.description?10:0}px;line-height:1.3;font-family:'Noto Serif JP',serif">${escHtml(s.title)}</div>
        ${s.description ? `<div style="font-size:${n>4?18:21}px;color:${C.muted};line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(s.description)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:flex;flex-direction:column">
    ${cards}
  </div>`;
  return baseHtml(def.title, body);
}

// ─── レイアウトシステム (applyLayout) ────────────────────────────────────────
// 記事「AIスライドの『AIっぽさ』を消す」のシステムに準拠:
//   カラム数 × 上段帯 × 下段バー × サイドバーのパラメータ組み合わせで
//   全レイアウトゾーンを自動計算する。

interface Zone { top:number; left:number; right:number; bottom:number; width:number; height:number; }
interface LayoutZones {
  header: Zone;
  main: Zone;
  cols: Zone[];
  topBand?: Zone;
  bottomBar?: Zone;
  sidebar?: Zone;
}

/** フォントサイズテーブル — カラム数に応じて自動決定 (列数 1〜5) */
const FS_TABLE = {
  kpi:     [72, 60, 50, 44, 36],
  title:   [56, 48, 42, 38, 36],
  subtitle:[44, 40, 38, 36, 36],
  body:    [40, 36, 36, 36, 36],
  caption: [16, 14, 13, 12, 11],  // 注釈のみ例外
} as const;

function fsize(cat: keyof typeof FS_TABLE, cols: number): number {
  return FS_TABLE[cat][Math.min(Math.max(cols - 1, 0), 4)];
}

/**
 * レイアウトゾーン計算関数。
 * CSS Tailwind の grid-cols-N に相当する仕組み — パラメータ指定で座標が自動決定される。
 */
function applyLayout(opts: {
  columns?: number;
  topBandH?: number;
  bottomBarH?: number;
  sidebarW?: number;
  splitRatio?: [number, number];
  noHeader?: boolean;
}): LayoutZones {
  const cols     = opts.columns ?? 1;
  const noHdr    = opts.noHeader ?? false;
  const padL = 72, padR = 72, padT = 60, padB = 48;
  const headerH  = noHdr ? 0 : 140;
  const gapX     = 24;

  const header: Zone = {
    top: padT, left: padL, right: SLIDE_W - padR,
    bottom: padT + headerH, width: SLIDE_W - padL - padR, height: headerH,
  };

  let mainTop = padT + headerH;
  let topBand: Zone | undefined;
  if (opts.topBandH) {
    topBand = { top: mainTop, left: padL, right: SLIDE_W - padR, bottom: mainTop + opts.topBandH, width: SLIDE_W - padL - padR, height: opts.topBandH };
    mainTop += opts.topBandH + 24;
  }

  let mainBottom = SLIDE_H - padB;
  let bottomBar: Zone | undefined;
  if (opts.bottomBarH) {
    const bTop = mainBottom - opts.bottomBarH;
    bottomBar = { top: bTop, left: padL, right: SLIDE_W - padR, bottom: mainBottom, width: SLIDE_W - padL - padR, height: opts.bottomBarH };
    mainBottom = bTop - 24;
  }

  let mainLeft = padL, mainRight = SLIDE_W - padR;
  let sidebar: Zone | undefined;
  if (opts.sidebarW) {
    sidebar = { top: mainTop, left: mainRight - opts.sidebarW, right: mainRight, bottom: mainBottom, width: opts.sidebarW, height: mainBottom - mainTop };
    mainRight = sidebar.left - 32;
  }

  const mainW = mainRight - mainLeft;
  const mainH = mainBottom - mainTop;
  const main: Zone = { top: mainTop, left: mainLeft, right: mainRight, bottom: mainBottom, width: mainW, height: mainH };

  const colZones: Zone[] = [];
  if (cols <= 1) {
    colZones.push({ ...main });
  } else if (opts.splitRatio) {
    const [rL, rR] = opts.splitRatio;
    const lW = Math.round(mainW * rL / (rL + rR)) - gapX / 2;
    const rW = mainW - lW - gapX;
    colZones.push({ top: mainTop, left: mainLeft, right: mainLeft + lW, bottom: mainBottom, width: lW, height: mainH });
    colZones.push({ top: mainTop, left: mainLeft + lW + gapX, right: mainRight, bottom: mainBottom, width: rW, height: mainH });
  } else {
    const colW = Math.round((mainW - gapX * (cols - 1)) / cols);
    for (let c = 0; c < cols; c++) {
      const l = mainLeft + c * (colW + gapX);
      colZones.push({ top: mainTop, left: l, right: l + colW, bottom: mainBottom, width: colW, height: mainH });
    }
  }

  return { header, main, cols: colZones, topBand, bottomBar, sidebar };
}

// ─── McKinsey 流レイアウトバリアント (rich-panel の代替) ──────────────────────
// 同一レイアウト連続禁止のため、同データ (title + points[]) を
// 4種の異なる視覚表現で描画する。

/** [Var-A] スタックリスト — McKinsey ヘアラインカード + 01/02 番号ラベル */
function renderStackedList(def: SlideDef): string {
  type RichPoint = { text?: string; value?: string; unit?: string; body?: string; source?: string };
  const rawPoints = Array.isArray(def.data.points) ? def.data.points as (string | RichPoint)[] : [];
  const items: RichPoint[] = rawPoints.map(p => typeof p === 'string' ? { text: p } : p);
  const n = items.length;
  const COLORS = ['#0a72ef','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];
  const titleFS = def.title.length > 22 ? 48 : 56;
  const textFS  = n <= 2 ? 54 : n === 3 ? 52 : n <= 5 ? 32 : 26;
  const bodyFS  = n <= 2 ? 28 : n <= 3 ? 24 : n <= 5 ? 20 : 16;
  const valFS   = n <= 2 ? 64 : n === 3 ? 52 : 40;

  const cardItems = items.map((p, i) => {
    const color = COLORS[i % COLORS.length];
    const numLabel = String(i + 1).padStart(2, '0');
    const label = escHtml(p.text ?? '');
    const bodyHtml = p.body
      ? `<div style="font-size:${bodyFS}px;color:${C.muted};margin-top:8px;line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(p.body)}</div>`
      : '';
    const sourceHtml = p.source
      ? `<div style="font-size:13px;color:${C.dim};margin-top:12px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.08);font-family:'Inter',sans-serif">出典: ${escHtml(p.source)}</div>`
      : '';
    const valHtml = p.value
      ? `<div style="flex-shrink:0;padding:0 36px;display:flex;align-items:center;border-left:1px solid rgba(0,0,0,0.08)">
           <div style="font-size:${valFS}px;font-weight:800;color:${color};line-height:1;font-family:'Inter',sans-serif">${escHtml(p.value)}${p.unit ? `<span style="font-size:16px;margin-left:6px">${escHtml(p.unit)}</span>` : ''}</div>
         </div>`
      : '';
    return `
    <div style="flex:1;display:flex;align-items:stretch;border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-left:3px solid ${color};border-radius:2px;background:#fafafa;overflow:hidden">
      <div style="flex-shrink:0;width:88px;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(0,0,0,0.10)">
        <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Inter',sans-serif">${numLabel}</div>
      </div>
      <div style="flex:1;padding:0 40px;display:flex;flex-direction:column;justify-content:center;overflow:hidden">
        <div style="font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Serif JP',serif">${label}</div>
        ${bodyHtml}
        ${sourceHtml}
      </div>
      ${valHtml}
    </div>`;
  }).join('');

  const gridStyle = n >= 5
    ? `display:grid;grid-template-columns:repeat(2,1fr);gap:12px`
    : `display:flex;flex-direction:column;gap:16px`;

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;${gridStyle}">
    ${cardItems}
  </div>`;
  return baseHtml(def.title, body);
}

/** [Var-B] チェックグリッド — 2列グリッド＋チェックアイコン */
/** [McKinsey] Key Findings グリッド
 *  points は以下の両形式を受け入れる（後方互換）:
 *    string[]  — シンプル形式（番号 + テキストのみ）
 *    Array<{ text, value?, unit?, body?, source? }>  — リッチ形式
 */
function renderCheckGrid(def: SlideDef): string {
  type RichPoint = { text: string; value?: string; unit?: string; body?: string; source?: string };
  const rawPoints = Array.isArray(def.data.points) ? def.data.points as (string | RichPoint)[] : [];
  const points: RichPoint[] = rawPoints.map(p => typeof p === 'string' ? { text: p } : p);

  const n = points.length;
  const hasRichData = points.some(p => p.value || p.body || p.source);
  const rows = Math.ceil(n / 2);

  const titleFS = def.title.length > 22 ? 48 : 56;
  const textFS  = n <= 2 ? 40 : n <= 4 ? 34 : 24;
  const valueFS = n <= 2 ? 80 : n <= 4 ? 66 : 48;
  const bodyFS  = n <= 2 ? 24 : n <= 4 ? 22 : 16;
  const unitFS  = n <= 2 ? 20 : 18;
  const numFS   = 14;
  const srcFS   = 15;

  const COLORS = [C.accent, '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

  const items = points.map((p, i) => {
    const isLastOdd = (i === n - 1) && (n % 2 === 1);
    const spanStyle = isLastOdd ? 'grid-column:1/span 2;' : '';
    const numLabel  = String(i + 1).padStart(2, '0');
    const color     = COLORS[i % COLORS.length];
    const cardBase  = `${spanStyle}border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-radius:2px;background:${C.bg2}`;

    if (hasRichData) {
      // リッチカード: 番号 → タイトル + KPI数値 → 副文 → 出典
      return `
    <div style="${cardBase};display:flex;flex-direction:column;padding:22px 36px 18px">
      <div style="font-size:${numFS}px;font-weight:700;color:${color};letter-spacing:3px;margin-bottom:10px;font-family:'Inter',sans-serif">${numLabel}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex:1">
        <div style="flex:1;min-width:0">
          <div style="font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.35;font-family:'Noto Serif JP',serif;margin-bottom:${p.body ? 10 : 0}px">${escHtml(p.text)}</div>
          ${p.body ? `<div style="font-size:${bodyFS}px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif">${escHtml(p.body)}</div>` : ''}
        </div>
        ${p.value ? `
        <div style="flex-shrink:0;text-align:right;margin-left:20px">
          <div style="font-size:${valueFS}px;font-weight:700;color:${color};line-height:1;font-variant-numeric:tabular-nums;font-family:'Inter',sans-serif">${escHtml(p.value)}</div>
          ${p.unit ? `<div style="font-size:${unitFS}px;color:${C.muted};margin-top:5px;font-family:'Inter',sans-serif">${escHtml(p.unit)}</div>` : ''}
        </div>` : ''}
      </div>
      ${p.source ? `<div style="font-size:${srcFS}px;color:${C.dim};margin-top:14px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);font-family:'Inter',sans-serif">出典: ${escHtml(p.source)}</div>` : ''}
    </div>`;
    } else {
      // シンプルカード（後方互換）: 番号 | テキスト
      return `
    <div style="${cardBase};display:flex;align-items:center;padding:0 36px;gap:28px">
      <div style="flex-shrink:0;font-size:22px;font-weight:800;color:${color};letter-spacing:1px;font-family:'Inter',sans-serif;min-width:36px">${numLabel}</div>
      <div style="width:1px;height:44px;background:rgba(0,0,0,0.12);flex-shrink:0"></div>
      <div style="flex:1;font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.45;font-family:'Noto Serif JP',serif">${escHtml(p.text)}</div>
    </div>`;
    }
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(${rows},1fr);gap:12px">
    ${items}
  </div>`;
  return baseHtml(def.title, body);
}

/** [Var-C] キーメッセージ — McKinsey "So What?" ダークバナー＋01/02番号ラベル */
function renderKeyMessage(def: SlideDef): string {
  const points: string[] = Array.isArray(def.data.points) ? def.data.points as string[] : [];
  const n = points.length;
  const bannerH = 240;
  const titleFS = def.title.length > 22 ? 52 : def.title.length > 16 ? 60 : 68;
  const pointFS = n <= 3 ? 42 : n <= 5 ? 36 : 36;
  const COLORS = ['#0a72ef','#7c3aed','#059669','#d97706','#dc2626'];

  const bullets = points.map((p, i) => {
    const color = COLORS[i % COLORS.length];
    const numLabel = String(i + 1).padStart(2, '0');
    return `
    <div style="display:flex;align-items:flex-start;gap:24px">
      <div style="flex-shrink:0;display:flex;align-items:center;gap:12px;margin-top:${Math.round(pointFS * 0.1)}px">
        <div style="width:4px;height:${pointFS * 1.4}px;background:${color};border-radius:2px;flex-shrink:0"></div>
        <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Inter',sans-serif;min-width:28px">${numLabel}</div>
      </div>
      <div style="font-size:${pointFS}px;font-weight:700;color:${C.text};line-height:1.55;flex:1;font-family:'Noto Serif JP',serif">${escHtml(pointText(p))}</div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;top:0;left:8px;right:0;height:${bannerH}px;background:${C.dark};display:flex;align-items:center;padding:0 72px">
    <div style="font-size:${titleFS}px;font-weight:800;color:#ffffff;line-height:1.1;letter-spacing:-1.5px;max-width:1600px;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${bannerH + 40}px;bottom:40px;display:flex;flex-direction:column;justify-content:space-evenly">
    ${bullets}
  </div>`;
  return baseHtml(def.title, body);
}

/** [Var-D] ビフォーアフター — McKinsey シナリオ対比 (前半=課題、後半=機会) */
function renderBeforeAfter(def: SlideDef): string {
  const points: string[] = Array.isArray(def.data.points) ? def.data.points as string[] : [];
  const leftLabel  = String(def.data.leftLabel  ?? 'リスク / 懸念');
  const rightLabel = String(def.data.rightLabel ?? '機会 / 対策');
  const mid = Math.ceil(points.length / 2);
  const leftPoints  = points.slice(0, mid);
  const rightPoints = points.slice(mid);
  const n = Math.max(leftPoints.length, rightPoints.length);
  const pointFS = n <= 2 ? 42 : n <= 3 ? 38 : 36;

  const makeItems = (items: string[], color: string) => items.map(p => `
    <div style="display:flex;align-items:flex-start;gap:16px;padding:16px 0;border-bottom:1px solid rgba(0,0,0,0.07)">
      <div style="flex-shrink:0;width:10px;height:10px;border-radius:50%;background:${color};margin-top:${Math.round(pointFS * 0.38)}px"></div>
      <div style="font-size:${pointFS}px;color:${C.text};line-height:1.5">${escHtml(pointText(p))}</div>
    </div>`).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:48px;display:flex;gap:0">
    <div style="flex:1;background:#fff8f6;border-radius:16px 0 0 16px;padding:32px 36px;border:1px solid rgba(220,38,38,0.18)">
      <div style="font-size:17px;font-weight:700;color:#dc2626;letter-spacing:0.8px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <div style="width:26px;height:26px;border-radius:50%;background:#dc2626;display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;font-weight:800">!</div>
        ${escHtml(leftLabel)}
      </div>
      ${makeItems(leftPoints, '#dc2626')}
    </div>
    <div style="flex-shrink:0;width:52px;background:${C.card};display:flex;align-items:center;justify-content:center">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${C.accent}" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
    </div>
    <div style="flex:1;background:#f0f7ff;border-radius:0 16px 16px 0;padding:32px 36px;border:1px solid rgba(10,114,239,0.18)">
      <div style="font-size:17px;font-weight:700;color:${C.accent};letter-spacing:0.8px;margin-bottom:20px;display:flex;align-items:center;gap:10px">
        <div style="width:26px;height:26px;border-radius:50%;background:${C.accent};display:flex;align-items:center;justify-content:center;font-size:13px;color:#fff;font-weight:800">→</div>
        ${escHtml(rightLabel)}
      </div>
      ${makeItems(rightPoints, C.accent)}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

// ─── 新プリセットレイアウト ───────────────────────────────────────────────────

/** presetKPICards: 上段帯にKPI数値 + 下段にN列カード */
function renderKpiBand(def: SlideDef): string {
  const kpis: Array<{value:string;unit?:string;label:string}> =
    Array.isArray(def.data.kpis) ? def.data.kpis as Array<{value:string;unit?:string;label:string}> : [];
  const cards: Array<{title:string;body?:string}> =
    Array.isArray(def.data.cards) ? def.data.cards as Array<{title:string;body?:string}> : [];
  const nKpi  = kpis.length || 1;
  const nCard = cards.length || 1;
  const bandH = 240;

  const kpiItems = kpis.map((k, i) => {
    const notLast = i < kpis.length - 1;
    return `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px 16px;${notLast ? `border-right:1px solid ${C.border};` : ''}">
      <div style="font-size:${fsize('kpi', nKpi)}px;font-weight:900;color:${C.accent};line-height:1;letter-spacing:-2px">${escHtml(k.value)}</div>
      ${k.unit ? `<div style="font-size:18px;color:${C.muted};margin-top:6px">${escHtml(k.unit)}</div>` : ''}
      <div style="font-size:18px;color:${C.muted};margin-top:10px;font-weight:500;text-align:center;line-height:1.4">${escHtml(k.label)}</div>
    </div>`;
  }).join('');

  const accentColors = [C.accent,'#7c3aed','#059669','#d97706','#dc2626'];
  const cardItems = cards.map((c, i) => {
    const color = accentColors[i % accentColors.length];
    const titleFS = fsize('subtitle', nCard);
    const bodyFS  = fsize('body', nCard);
    return `
    <div class="v-card" style="flex:1;padding:32px;display:flex;flex-direction:column;gap:14px">
      <div style="width:40px;height:5px;background:${color};border-radius:3px"></div>
      <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};line-height:1.3">${escHtml(c.title)}</div>
      ${c.body ? `<div style="font-size:${bodyFS}px;color:${C.muted};line-height:1.6;flex:1">${escHtml(c.body)}</div>` : ''}
    </div>`;
  }).join('');

  const zones = applyLayout({ topBandH: bandH });

  const body = `
  <div style="position:absolute;left:${zones.header.left}px;top:${zones.header.top}px;right:${SLIDE_W - zones.header.right}px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${zones.topBand!.top}px;height:${bandH}px;display:flex;background:${C.card};border-radius:16px;box-shadow:0 0 0 1px ${C.border};overflow:hidden">
    ${kpiItems}
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${zones.main.top}px;bottom:${SLIDE_H - zones.main.bottom}px;display:flex;gap:20px">
    ${cardItems}
  </div>`;
  return baseHtml(def.title, body);
}

/** presetTwoCol: 2カラム左右分割 (デフォルト 7:5) */
function renderTwoCol(def: SlideDef): string {
  const leftData  = (def.data.left  ?? {}) as {title?:string;points?:string[];body?:string};
  const rightData = (def.data.right ?? {}) as {title?:string;points?:string[];body?:string;stat?:{value:string;unit?:string;label:string}};
  const splitRatio: [number,number] = Array.isArray(def.data.splitRatio) ? (def.data.splitRatio as [number,number]) : [7, 5];

  const zones = applyLayout({ columns: 2, splitRatio });
  const [lZone, rZone] = zones.cols;

  const leftPoints = (leftData.points ?? []).map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:16px;padding:14px 0;border-bottom:1px solid ${C.border}">
      <div style="flex-shrink:0;width:28px;height:28px;border-radius:50%;background:${C.accent};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;margin-top:2px">${i+1}</div>
      <div style="font-size:22px;color:${C.text};line-height:1.5;flex:1">${escHtml(pointText(p))}</div>
    </div>`).join('');

  const rightPoints = (rightData.points ?? []).map(p => `
    <div class="v-card" style="padding:18px 24px;display:flex;align-items:center;gap:16px">
      <div style="width:8px;height:8px;border-radius:50%;background:${C.accent};flex-shrink:0"></div>
      <div style="font-size:22px;color:${C.text};line-height:1.45">${escHtml(pointText(p))}</div>
    </div>`).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:48px;display:flex;gap:32px">
    <div style="width:${lZone.width}px;display:flex;flex-direction:column;gap:0">
      ${leftData.title ? `<div style="font-size:24px;font-weight:700;color:${C.accent};margin-bottom:14px">${escHtml(leftData.title)}</div>` : ''}
      ${leftPoints}
      ${leftData.body ? `<div style="font-size:20px;color:${C.muted};line-height:1.7;margin-top:16px">${escHtml(leftData.body)}</div>` : ''}
    </div>
    <div style="width:1px;background:${C.border};flex-shrink:0;align-self:stretch"></div>
    <div style="flex:1;display:flex;flex-direction:column;gap:12px">
      ${rightData.title ? `<div style="font-size:24px;font-weight:700;color:${C.heading};margin-bottom:4px">${escHtml(rightData.title)}</div>` : ''}
      ${rightPoints}
      ${rightData.stat ? `
      <div style="margin-top:16px;text-align:center;padding:28px;background:${C.card};border-radius:16px">
        <div style="font-size:80px;font-weight:900;color:${C.accent};line-height:1;letter-spacing:-2px">${escHtml(rightData.stat.value)}</div>
        ${rightData.stat.unit ? `<div style="font-size:18px;color:${C.muted};margin-top:8px">${escHtml(rightData.stat.unit)}</div>` : ''}
        <div style="font-size:18px;color:${C.muted};margin-top:10px">${escHtml(rightData.stat.label)}</div>
      </div>` : ''}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** presetFeatureCards: N列均等カード (3〜4列が典型) */
function renderFeatureCards(def: SlideDef): string {
  const cards: Array<{icon?:string;title:string;body?:string}> =
    Array.isArray(def.data.cards) ? def.data.cards as Array<{icon?:string;title:string;body?:string}> : [];
  const n = cards.length || 1;
  const COLORS = ['#0a72ef','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];
  const titleFS = fsize('subtitle', n);
  const bodyFS  = fsize('body', n);
  const slideTitleFS = def.title.length > 22 ? 48 : 56;

  const cardItems = cards.map((c, i) => {
    const color = COLORS[i % COLORS.length];
    const numLabel = String(i + 1).padStart(2, '0');
    return `
    <div style="flex:1;border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-radius:2px;background:#fafafa;padding:32px 28px;display:flex;flex-direction:column;gap:14px">
      <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Inter',sans-serif">${numLabel}</div>
      <div style="height:1px;background:rgba(0,0,0,0.10)"></div>
      <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};line-height:1.3;font-family:'Noto Serif JP',serif">${escHtml(c.title)}</div>
      ${c.body ? `<div style="font-size:${bodyFS}px;color:${C.muted};line-height:1.6;font-family:'Noto Sans JP',sans-serif">${escHtml(c.body)}</div>` : ''}
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${slideTitleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:flex;gap:20px">
    ${cardItems}
  </div>`;
  return baseHtml(def.title, body);
}

// ─── McKinsey 新レイアウト ────────────────────────────────────────────────────

/** McKinsey p80: アイコンマトリクス — 色付き角丸アイコン行 + テキスト (水平区切り線) */
function renderIconMatrix(def: SlideDef): string {
  const points: string[] = Array.isArray(def.data.points) ? def.data.points as string[] : [];
  const n = points.length || 1;
  const colors = [C.accent,'#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#0e7490'];
  const labels = ['A','B','C','D','E','F','G','H'];
  const textFS = n <= 3 ? 40 : n <= 5 ? 36 : 36;
  const iconSz = n <= 3 ? 80 : n <= 5 ? 64 : 52;

  const rows = points.map((p, i) => {
    const color = colors[i % colors.length];
    return `
    <div style="display:flex;align-items:center;gap:36px;flex:1;${i < n-1 ? `border-bottom:1px solid ${C.border};` : ''}padding:8px 0">
      <div style="flex-shrink:0;width:${iconSz}px;height:${iconSz}px;border-radius:${Math.round(iconSz*0.2)}px;background:${color};display:flex;align-items:center;justify-content:center">
        <span style="font-size:${Math.round(iconSz*0.42)}px;font-weight:900;color:#fff;letter-spacing:-0.5px">${labels[i % labels.length]}</span>
      </div>
      <div style="flex:1;font-size:${textFS}px;font-weight:600;color:${C.heading};line-height:1.4">${escHtml(pointText(p))}</div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:48px;display:flex;flex-direction:column">
    ${rows}
  </div>`;
  return baseHtml(def.title, body);
}

/** McKinsey p20: 2時代分割タイムライン (左: 旧時代 / 右: 新時代 = 青背景) */
function renderEraSplit(def: SlideDef): string {
  const events: Array<{year:string;label:string;highlight?:boolean}> =
    Array.isArray(def.data.events) ? def.data.events as typeof events : [];

  let leftEvs = events.filter(e => !e.highlight);
  let rightEvs = events.filter(e => !!e.highlight);
  // highlight 区分がない場合は前半/後半で分割
  if (rightEvs.length === 0 && events.length > 0) {
    const mid = Math.ceil(events.length / 2);
    leftEvs = events.slice(0, mid);
    rightEvs = events.slice(mid);
  }

  const evFontSize = Math.max(leftEvs.length, rightEvs.length) <= 3 ? 40 : 28;
  const evRows = (evts: typeof events, accent: string) =>
    evts.map(e => `
    <div style="flex:1;display:flex;align-items:center;gap:16px;border-bottom:1px solid rgba(0,0,0,0.06);min-height:0">
      <div style="flex-shrink:0;min-width:64px;font-size:16px;font-weight:700;color:${accent};text-align:right">${escHtml(e.year)}</div>
      <div style="flex-shrink:0;width:12px;height:12px;border-radius:50%;background:${accent};box-shadow:0 0 0 3px ${accent}33"></div>
      <div style="flex:1;font-size:${evFontSize}px;font-weight:700;color:${e.highlight ? C.heading : C.muted};line-height:1.4;font-family:'Noto Serif JP',serif">${escHtml(e.label)}</div>
    </div>`).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:0;right:0;top:190px;bottom:0;display:flex">
    <div style="flex:1;padding:32px 40px 32px 72px;border-right:2px solid ${C.border};display:flex;flex-direction:column">
      <div style="font-size:13px;font-weight:700;color:${C.muted};letter-spacing:1.5px;margin-bottom:20px;text-transform:uppercase;flex-shrink:0">過去</div>
      <div style="flex:1;display:flex;flex-direction:column">
        ${evRows(leftEvs, C.muted)}
      </div>
    </div>
    <div style="flex:1;background:${C.accent}12;padding:32px 72px 32px 40px;display:flex;flex-direction:column">
      <div style="font-size:13px;font-weight:700;color:${C.accent};letter-spacing:1.5px;margin-bottom:20px;text-transform:uppercase;flex-shrink:0">現在・今後</div>
      <div style="flex:1;display:flex;flex-direction:column">
        ${evRows(rightEvs, C.accent)}
      </div>
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** McKinsey p30: 左右2列 + 縦仕切り線、CSS Grid 2×N でセンタリング保証 */
function renderInsightSplit(def: SlideDef): string {
  const points: string[] = Array.isArray(def.data.points) ? def.data.points as string[] : [];
  const n = points.length || 1;
  const COLORS = ['#0a72ef','#7c3aed','#059669','#d97706','#dc2626','#0891b2'];
  const mid = Math.ceil(n / 2);
  const leftPts  = points.slice(0, mid);
  const rightPts = points.slice(mid);
  const textFS = n <= 4 ? 38 : 36;
  const rows = Math.max(leftPts.length, rightPts.length);
  const titleFS = def.title.length > 22 ? 48 : 56;

  const makeCard = (p: string, idx: number, col: number, row: number) => {
    const color = COLORS[idx % COLORS.length];
    const numLabel = String(idx + 1).padStart(2, '0');
    return `
    <div style="grid-column:${col};grid-row:${row};border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-radius:2px;background:#fafafa;padding:20px 28px;display:flex;align-items:center;gap:20px">
      <div style="flex-shrink:0;width:40px;height:40px;border-radius:4px;background:${color};display:flex;align-items:center;justify-content:center">
        <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:2px;font-family:'Inter',sans-serif">${numLabel}</span>
      </div>
      <div style="font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Serif JP',serif">${escHtml(pointText(p))}</div>
    </div>`;
  };

  const leftCards  = leftPts.map((p, i) => makeCard(p as string, i, 1, i + 1)).join('');
  const rightCards = rightPts.map((p, i) => makeCard(p as string, mid + i, 3, i + 1)).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Serif JP',serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:grid;grid-template-columns:1fr 1px 1fr;grid-template-rows:repeat(${rows},1fr);gap:12px 0">
    <div style="grid-column:2;grid-row:1/span ${rows};background:rgba(0,0,0,0.10);width:1px;justify-self:center"></div>
    ${leftCards}
    ${rightCards}
  </div>`;
  return baseHtml(def.title, body);
}

// ─── ディスパッチャー ─────────────────────────────────────────────────────────

function renderSlide(def: SlideDef): string {
  switch (def.layout) {
    case 'cover':          return renderCover(def);
    case 'toc':            return renderToc(def);
    case 'section':        return renderSection(def);
    case 'stat':           return renderStat(def);
    case 'chart':               return renderChart(def);
    case 'chart-insight-split': return renderChartInsight(def);
    case 'rich-panel':          return renderRichPanel(def);
    case 'timeline':       return renderTimeline(def);
    case 'table':          return renderTable(def);
    case 'radial':         return renderRadial(def);
    case 'step-flow':      return renderStepFlow(def);
    // McKinsey バリアント (rich-panel 代替)
    case 'stacked-list':   return renderStackedList(def);
    case 'check-grid':     return renderCheckGrid(def);
    case 'key-message':    return renderKeyMessage(def);
    case 'before-after':   return renderBeforeAfter(def);
    // McKinsey 新レイアウト
    case 'icon-matrix':    return renderIconMatrix(def);
    case 'era-split':      return renderEraSplit(def);
    case 'insight-split':  return renderInsightSplit(def);
    // 新プリセット
    case 'kpi-band':       return renderKpiBand(def);
    case 'two-col':        return renderTwoCol(def);
    case 'feature-cards':  return renderFeatureCards(def);
    default:               return renderStat(def);
  }
}

// ─── script-input.json → SlideDef 変換 ────────────────────────────────────────

function visualToSlide(visual: Visual, section: string, chartData: Record<string,ChartEntry>, narratorText?: string): SlideDef | null {
  switch (visual.type) {
    case 'stat': {
      const v = visual as StatVisual;
      // visual.description を優先。なければナレーターテキストをフォールバック
      const description = v.description ?? narratorText ?? '';
      return { title: v.label, section, layout: 'stat', data: { stats: [{ value: v.value, label: v.label, unit: v.unit ?? '' }], description } };
    }
    case 'chart': {
      const v = visual as ChartVisual;
      const cd = chartData[v.key];
      if (!cd) return null;
      // insight があればチャート＋インサイトパネルレイアウト、なければ通常チャート
      const insight = v.insight ?? narratorText ?? '';
      const layout = insight ? 'chart-insight-split' : 'chart';
      return { title: cd.title ?? '', section, layout, data: { insight }, chartData: cd };
    }
    case 'rich-panel': {
      const v = visual as RichPanel;
      return { title: v.title, section, layout: 'rich-panel', data: { points: v.points } };
    }
    case 'timeline': {
      const v = visual as TimelineVis;
      return { title: 'タイムライン', section, layout: 'timeline', data: { events: v.events } };
    }
    case 'comparison-table': {
      const v = visual as CompTableVis;
      const cols = v.columns.map(c => typeof c === 'string' ? c : c.label);
      return { title: v.title ?? '', section, layout: 'table', data: { columns: cols, rows: v.rows } };
    }
    case 'flow-chart': {
      const v = visual as FlowChart;
      if (v.root) {
        return { title: v.title ?? '', section, layout: 'radial', data: { center: v.root.label, items: (v.root.children ?? []).map(c => ({ label: c.label })) } };
      }
      return { title: v.title ?? '', section, layout: 'step-flow', data: { steps: v.steps ?? [] } };
    }
    case 'image':
      return null;
    default:
      return null;
  }
}

// ─── インデックス HTML ────────────────────────────────────────────────────────

function buildIndex(slideFiles: string[], videoTitle: string): string {
  const thumbW = 380;
  const thumbH = Math.round(thumbW * SLIDE_H / SLIDE_W);
  const ratio  = thumbH / SLIDE_H;

  const thumbs = slideFiles.map((f,i) => `
    <div onclick="openSlide(${i})" style="cursor:pointer;width:${thumbW}px;height:${thumbH}px;border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,0.12);transition:box-shadow .2s;position:relative" onmouseover="this.style.boxShadow='0 0 0 2px #0a72ef'" onmouseout="this.style.boxShadow='0 0 0 1px rgba(0,0,0,0.12)'">
      <iframe src="${path.basename(f)}" scrolling="no" style="width:${SLIDE_W}px;height:${SLIDE_H}px;transform:scale(${ratio});transform-origin:top left;pointer-events:none;border:none"></iframe>
      <div style="position:absolute;bottom:6px;right:8px;background:rgba(0,0,0,0.65);color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:4px">${String(i+1).padStart(2,'0')}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${escHtml(videoTitle)} — スライド一覧</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:'Inter','Noto Sans JP',sans-serif;min-height:100vh}
  .hdr{padding:32px 40px 20px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.08)}
  .grid{padding:32px 40px;display:flex;flex-wrap:wrap;gap:20px}
  #lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;align-items:center;justify-content:center;flex-direction:column;gap:20px}
  #lb-frame{border:none;border-radius:8px;box-shadow:0 24px 48px rgba(0,0,0,0.5)}
</style>
</head>
<body>
<div class="hdr">
  <div style="color:#0a72ef;font-size:13px;font-weight:700;letter-spacing:1px;margin-bottom:6px">SLIDE DECK</div>
  <div style="color:#171717;font-size:28px;font-weight:700;letter-spacing:-0.5px">${escHtml(videoTitle)}</div>
  <div style="color:#666;font-size:14px;margin-top:4px">${slideFiles.length} スライド</div>
</div>
<div class="grid">${thumbs}</div>

<div id="lb">
  <iframe id="lb-frame" style="width:${Math.round(SLIDE_W*0.65)}px;height:${Math.round(SLIDE_H*0.65)}px"></iframe>
  <div style="display:flex;gap:16px;align-items:center">
    <button onclick="nav(-1)" style="background:#0a72ef;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:18px;cursor:pointer;font-weight:600">‹ 前</button>
    <span id="lb-num" style="color:#fff;font-size:16px;min-width:80px;text-align:center"></span>
    <button onclick="nav(1)"  style="background:#0a72ef;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:18px;cursor:pointer;font-weight:600">次 ›</button>
  </div>
  <button onclick="closeLB()" style="position:fixed;top:20px;right:28px;background:transparent;color:#aaa;border:none;font-size:36px;cursor:pointer;line-height:1">✕</button>
</div>

<script>
const slides=${JSON.stringify(slideFiles.map(f=>path.basename(f)))};
let cur=0;
function openSlide(i){cur=i;document.getElementById('lb').style.display='flex';update();}
function closeLB(){document.getElementById('lb').style.display='none';}
function nav(d){cur=(cur+d+slides.length)%slides.length;update();}
function update(){document.getElementById('lb-frame').src=slides[cur];document.getElementById('lb-num').textContent=(cur+1)+' / '+slides.length;}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLB();if(e.key==='ArrowRight')nav(1);if(e.key==='ArrowLeft')nav(-1);});
</script>
</body>
</html>`;
}

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function escHtml(s: unknown): string {
  const str = (typeof s === 'object' && s !== null && 'text' in s) ? String((s as {text:unknown}).text ?? '') : String(s ?? '');
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function pointText(p: unknown): string {
  if (typeof p === 'string') return p;
  if (typeof p === 'object' && p !== null) return String((p as {text?:unknown}).text ?? '');
  return String(p ?? '');
}

// ─── PNG エクスポート ─────────────────────────────────────────────────────────

async function exportPngs(htmlFiles: string[], pngDir: string): Promise<void> {
  console.log(`[html-slides] PNG エクスポート (${htmlFiles.length} 枚)...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-web-security'],
  });
  for (let i = 0; i < htmlFiles.length; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: SLIDE_W, height: SLIDE_H, deviceScaleFactor: 1 });
    await page.goto(`file://${htmlFiles[i]}`, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 600));
    const pngPath = path.join(pngDir, `slide-${String(i+1).padStart(3,'0')}.png`);
    await page.screenshot({ path: pngPath as `${string}.png`, type: 'png' });
    await page.close();
    process.stdout.write(`\r  ${i+1}/${htmlFiles.length} 完了`);
  }
  await browser.close();
  console.log('\n[html-slides] 完了');
}

// ─── メイン ───────────────────────────────────────────────────────────────────

interface SlideMapEntry {
  slideNum: number;
  slidePng: string;      // Remotion staticFile パス: 'html-slides/png/slide-001.png'
  type: 'cover' | 'toc' | 'section' | 'visual';
  audioFile?: string;    // visual タイプのみ（Remotion staticFile パス）
}

async function main() {
  const args     = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const noPng    = args.includes('--no-png');

  const inputPath = inputIdx >= 0
    ? path.resolve(args[inputIdx+1])
    : path.resolve(__dirname,'../input/script-input.json');

  if (!fs.existsSync(inputPath)) { console.error('入力ファイルが見つかりません:', inputPath); process.exit(1); }

  const script: ScriptInput = JSON.parse(fs.readFileSync(inputPath,'utf-8'));
  const chartData = script.chartData ?? {};

  console.log(`[html-slides] タイトル: ${script.title}`);

  const outDir    = path.resolve(__dirname,'../out/html-slides');
  const pngDir    = path.join(outDir,'png');
  const publicPngDir = path.resolve(__dirname,'../public/html-slides/png');
  fs.mkdirSync(pngDir,{recursive:true});
  fs.mkdirSync(publicPngDir,{recursive:true});

  const slideDefs: SlideDef[] = [];
  const slideMap: SlideMapEntry[] = [];

  // カバー (section タグは非表示 — videoId はメタ情報なので省略)
  slideDefs.push({ title: script.title, section: '', layout: 'cover', data: { subtitle: script.description ?? '' } });
  slideMap.push({ slideNum: 1, slidePng: 'html-slides/png/slide-001.png', type: 'cover' });

  // 目次スライドを生成 (CTAを除く全チャプターのトピックを列挙)
  const tocChapters: Array<{num:number;topic:string}> = [];
  let tocNum = 0;
  for (const ch of script.chapters) {
    if (ch.type === 'cta') continue;
    tocNum++;
    const topic = ch.topic ?? ch.type;
    if (topic) tocChapters.push({ num: tocNum, topic });
  }
  if (tocChapters.length > 0) {
    slideDefs.push({ title: '本日の内容', section: 'AGENDA', layout: 'toc', data: { chapters: tocChapters } });
    slideMap.push({ slideNum: slideDefs.length, slidePng: `html-slides/png/slide-${String(slideDefs.length).padStart(3,'0')}.png`, type: 'toc' });
  }

  // ─── アンチ連続ローテーション設定 ─────────────────────────────────────────
  // 同一レイアウトが繰り返されると視聴者が飽きるため、
  // 同じデータ型でも異なる視覚表現に自動切り替えする。
  const LAYOUT_ROTATION: Record<string, string[]> = {
    // rich-panel の6バリアント (McKinsey新レイアウト追加)
    'rich-panel': ['rich-panel', 'stacked-list', 'check-grid', 'key-message', 'icon-matrix', 'insight-split'],
    // step-flow の2バリアント
    'step-flow':  ['step-flow', 'stacked-list'],
    // radial の2バリアント
    'radial':     ['radial', 'feature-cards'],
    // timeline の2バリアント
    'timeline':   ['timeline', 'era-split'],
  };
  const rotateIdx: Record<string, number> = {};

  function antiRepeat(def: SlideDef): SlideDef {
    const variants = LAYOUT_ROTATION[def.layout];
    if (!variants) return def;
    const idx = rotateIdx[def.layout] ?? 0;
    rotateIdx[def.layout] = idx + 1;
    const newLayout = variants[idx % variants.length];
    if (newLayout === def.layout) return def;

    // レイアウト変換時にデータキーも合わせて変換
    let newData = def.data;
    if (def.layout === 'radial') {
      const items = Array.isArray(def.data.items) ? def.data.items as Array<{label:string}> : [];
      const points = items.map(i => i.label);
      if (newLayout === 'feature-cards' && items.length <= 3) {
        // アイテムが少ない場合は check-grid の方がテキスト大きく見栄えが良い
        return { ...def, layout: 'check-grid', data: { ...def.data, points } };
      } else if (newLayout === 'feature-cards') {
        // feature-cards は cards:[{title}] 形式
        newData = { ...def.data, cards: items.map(i => ({ title: i.label })) };
      } else {
        // stacked-list / check-grid / key-message は points:[string] 形式
        newData = { ...def.data, points };
      }
    } else if (def.layout === 'step-flow' && newLayout === 'stacked-list') {
      const steps = Array.isArray(def.data.steps) ? def.data.steps as Array<{title:string}> : [];
      newData = { ...def.data, points: steps.map(s => s.title) };
    }
    // timeline → era-split: データ形式は同じ (events[]) なのでそのまま使用
    return { ...def, layout: newLayout, data: newData };
  }

  const seen = new Set<string>();
  let chNum = 0;

  for (const chapter of script.chapters) {
    if (chapter.type === 'cta') continue;
    chNum++;
    // セクション区切り
    slideDefs.push({ title: chapter.topic ?? chapter.type, section: chapter.type, layout: 'section', data: { num: chNum } });
    slideMap.push({ slideNum: slideDefs.length, slidePng: `html-slides/png/slide-${String(slideDefs.length).padStart(3,'0')}.png`, type: 'section' });

    for (const line of chapter.lines) {
      if (!line.visual) continue;
      const key = line.visual.type === 'chart' ? `chart:${(line.visual as ChartVisual).key}`
                : line.visual.type === 'stat'  ? `stat:${(line.visual as StatVisual).value}` : null;
      if (key) { if (seen.has(key)) continue; seen.add(key); }
      const def = visualToSlide(line.visual, chapter.topic ?? chapter.type, chartData, line.text);
      if (!def) continue;
      slideDefs.push(antiRepeat(def));
      slideMap.push({
        slideNum: slideDefs.length,
        slidePng: `html-slides/png/slide-${String(slideDefs.length).padStart(3,'0')}.png`,
        type: 'visual',
        audioFile: (line as { audioFile?: string }).audioFile ?? undefined,
      });
    }
  }

  // HTML 書き出し
  const htmlFiles: string[] = [];
  slideDefs.forEach((def, i) => {
    const html  = renderSlide(def);
    const fname = `slide-${String(i+1).padStart(3,'0')}.html`;
    const fpath = path.join(outDir, fname);
    fs.writeFileSync(fpath, html, 'utf-8');
    htmlFiles.push(fpath);
  });

  // インデックス
  fs.writeFileSync(path.join(outDir,'index.html'), buildIndex(htmlFiles, script.title), 'utf-8');
  console.log(`[html-slides] HTML: ${htmlFiles.length} 枚 → ${outDir}`);

  // slide-map.json 出力（Remotion SlidesVideo 用）
  fs.writeFileSync(path.join(outDir,'slide-map.json'), JSON.stringify(slideMap, null, 2), 'utf-8');
  console.log(`[html-slides] slide-map.json: ${slideMap.length} エントリ`);

  if (!noPng) {
    await exportPngs(htmlFiles, pngDir);
    // public/html-slides/png/ にコピー（Remotion staticFile 用）
    for (let i = 0; i < htmlFiles.length; i++) {
      const srcPng  = path.join(pngDir, `slide-${String(i+1).padStart(3,'0')}.png`);
      const destPng = path.join(publicPngDir, `slide-${String(i+1).padStart(3,'0')}.png`);
      if (fs.existsSync(srcPng)) fs.copyFileSync(srcPng, destPng);
    }
    console.log(`[html-slides] public/html-slides/png/ にコピー完了`);
  }
}

main().catch(err => { console.error('[html-slides] エラー:', err); process.exit(1); });
