/** html-slides/renderers/basic.ts — cover / section / toc / stat */

import { C } from '../context';
import { escHtml, fmtTrend, baseHtml } from '../utils';
import type { SlideDef } from '../types';

/** カバースライド */
export function renderCover(def: SlideDef): string {
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
export function renderSection(def: SlideDef): string {
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
    <div style="margin-top:48px;font-size:28px;color:${C.muted};font-weight:700;line-height:1.5">
      Chapter ${num.padStart(2,'0')}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** 目次（アジェンダ）スライド */
export function renderToc(def: SlideDef): string {
  const chapters: Array<{num:number;topic:string}> =
    Array.isArray(def.data.chapters) ? def.data.chapters as Array<{num:number;topic:string}> : [];
  const n = chapters.length;
  const accentColors = [C.accent,'#7c3aed','#059669','#d97706','#dc2626','#0891b2','#db2777','#0e7490'];
  const itemFS  = n <= 4 ? 58 : n <= 6 ? 46 : 36;
  const badgeWH = n <= 4 ? 88  : n <= 6 ? 72  : 60;
  const badgeFS = n <= 4 ? 44  : n <= 6 ? 36  : 28;
  const cardPad = n <= 4 ? '36px 44px' : '26px 36px';
  const cardGap = n <= 4 ? 24 : 18;

  const items = chapters.map((ch, i) => {
    const color = accentColors[i % accentColors.length];
    return `
    <div style="display:flex;align-items:center;gap:36px;padding:${cardPad};background:${C.bg2};border-radius:14px;box-shadow:0 0 0 1.5px ${C.border};flex:1;border-left:6px solid ${color}">
      <div style="flex-shrink:0;width:${badgeWH}px;height:${badgeWH}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center">
        <span style="font-size:${badgeFS}px;font-weight:900;color:#fff">${ch.num}</span>
      </div>
      <div style="font-size:${itemFS}px;font-weight:700;color:${C.heading};line-height:1.3;font-family:'Noto Sans JP',sans-serif;letter-spacing:-0.5px">${escHtml(ch.topic)}</div>
    </div>`;
  }).join('');

  const cols = n > 5 ? 2 : 1;
  const gridStyle = cols === 2
    ? `display:grid;grid-template-columns:repeat(2,1fr);gap:${cardGap}px`
    : `display:flex;flex-direction:column;gap:${cardGap}px`;

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
export function renderStat(def: SlideDef): string {
  const stats: Array<{value:string;label:string;unit?:string;color?:string}> =
    Array.isArray(def.data.stats) ? def.data.stats as Array<{value:string;label:string;unit?:string;color?:string}> : [];
  const n = stats.length;

  if (n <= 1) {
    const s = stats[0] ?? {value:'', label:def.title};
    const description = String(def.data.description ?? '');
    const trend = typeof def.data.trend === 'number' ? def.data.trend as number : null;
    const body = `
    <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px;padding:0 80px">
      <div style="font-size:220px;font-weight:900;color:${C.accent};line-height:1;letter-spacing:-6px">${escHtml(s.value)}</div>
      ${s.unit ? `<div style="font-size:36px;color:${C.muted};margin-top:-12px">${escHtml(s.unit)}</div>` : ''}
      <div style="width:80px;height:4px;background:${C.accent};border-radius:2px"></div>
      <div style="font-size:34px;color:${C.heading};text-align:center;max-width:1400px;font-weight:700;line-height:1.4">${escHtml(s.label)}</div>
      ${trend !== null ? `<div style="font-size:32px;text-align:center">${fmtTrend(trend)}<span style="color:${C.muted};font-size:22px;margin-left:8px">前期比</span></div>` : ''}
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
      <div style="font-size:22px;color:${C.muted};font-weight:700;line-height:1.4">${escHtml(s.label)}</div>
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
