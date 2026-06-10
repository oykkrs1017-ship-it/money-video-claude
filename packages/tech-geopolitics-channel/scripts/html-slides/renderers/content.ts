/** html-slides/renderers/content.ts — rich-panel / timeline / table */

import { C, SLIDE_H } from '../context';
import { escHtml, baseHtml, renderBadge } from '../utils';
import type { SlideDef } from '../types';

/** 番号付きポイントカード */
export function renderRichPanel(def: SlideDef): string {
  type RichPoint = string | { text?: string; value?: string; unit?: string; body?: string; source?: string; badge?: string };
  const rawPoints: RichPoint[] = Array.isArray(def.data.points) ? def.data.points as RichPoint[] : [];
  const items = rawPoints.map(p => typeof p === 'string' ? { text: p } : p as Exclude<RichPoint, string>);
  const n = items.length;
  const COLORS = [C.accent];
  const titleFS = def.title.length > 22 ? 48 : 56;

  if (n <= 4) {
    const totalChars = items.reduce((s, p) => s + (p.text?.length ?? 0) + (p.body?.length ?? 0), 0);
    const charsPerRow = totalChars / Math.max(n, 1);
    const densityFactor = Math.max(0.65, Math.min(1.0, 90 / Math.max(charsPerRow, 30)));
    const baseTextSize = n <= 2 ? 64 : n === 3 ? 54 : 44;
    const textSize = Math.round(baseTextSize * densityFactor);
    const bodyFS2  = Math.round(textSize * 0.55);
    const rowGap   = n <= 2 ? 18 : 14;

    const rows = items.map((p, i) => {
      const color = COLORS[i % COLORS.length];
      const numLabel = String(i + 1).padStart(2, '0');
      const label = escHtml(p.text ?? '');
      const badgeHtml = p.badge ? renderBadge(p.badge) : '';
      const valHtml = p.value ? `<div style="font-size:32px;font-weight:800;color:${color};font-family:'Noto Sans JP',sans-serif;white-space:nowrap">${escHtml(p.value)}${p.unit ? `<span style="font-size:20px;margin-left:4px">${escHtml(p.unit)}</span>` : ''}</div>` : '';
      const bodyHtml = p.body ? `<div style="font-size:${bodyFS2}px;color:${C.muted};margin-top:10px;line-height:1.5;font-family:'Noto Sans JP',sans-serif">${escHtml(p.body)}</div>` : '';
      return `
      <div style="flex:1;display:flex;align-items:stretch;border:1px solid ${C.border};border-top:4px solid ${color};border-left:4px solid ${color};border-radius:8px;background:#ffffff;overflow:hidden;min-height:0">
        <div style="flex-shrink:0;width:96px;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(0,0,0,0.10)">
          <div style="font-size:20px;font-weight:800;color:${color};letter-spacing:3px;font-family:'Noto Sans JP',sans-serif">${numLabel}</div>
        </div>
        <div style="flex:1;padding:0 40px;display:flex;flex-direction:column;justify-content:center">
          <div style="font-size:${textSize}px;font-weight:700;color:${C.heading};line-height:1.35;font-family:'Noto Sans JP',sans-serif">${badgeHtml}${label}</div>
          ${bodyHtml}
        </div>
        ${valHtml ? `<div style="flex-shrink:0;padding:0 32px;display:flex;align-items:center;border-left:1px solid rgba(0,0,0,0.08)">${valHtml}</div>` : ''}
      </div>`;
    }).join('');

    const body = `
  <div style="position:absolute;left:48px;top:36px;right:48px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:60px;height:4px;background:${C.accent};margin-top:12px"></div>
  </div>
  <div style="position:absolute;left:48px;right:48px;top:160px;bottom:32px;display:flex;flex-direction:column;gap:${rowGap}px">
    ${rows}
  </div>`;
    return baseHtml(def.title, body);
  }

  // 多アイテム: 2列グリッドカード
  const cols = 2;
  const rows2 = Math.ceil(n / cols);
  const fontSize = n <= 6 ? 36 : 30;

  const cards = items.map((p, i) => {
    const color = COLORS[i % COLORS.length];
    const numLabel = String(i + 1).padStart(2, '0');
    const label = escHtml(p.text ?? '');
    const badgeHtml = p.badge ? renderBadge(p.badge) : '';
    const valHtml = p.value ? `<span style="font-size:26px;font-weight:800;color:${color};font-family:'Noto Sans JP',sans-serif">${escHtml(p.value)}${p.unit ? p.unit : ''}</span>` : '';
    const bodyHtml = p.body ? `<div style="font-size:${n <= 6 ? 26 : 22}px;color:${C.muted};margin-top:8px;line-height:1.5;font-family:'Noto Sans JP',sans-serif">${escHtml(p.body)}</div>` : '';
    return `
    <div style="border:1px solid ${C.border};border-top:4px solid ${color};border-radius:8px;background:#ffffff;padding:22px 28px;display:flex;align-items:flex-start;gap:22px">
      <div style="flex-shrink:0;font-size:18px;font-weight:800;color:${color};letter-spacing:3px;font-family:'Noto Sans JP',sans-serif;min-width:36px;padding-top:4px">${numLabel}</div>
      <div style="width:1px;min-height:36px;background:rgba(0,0,0,0.10);flex-shrink:0;align-self:stretch"></div>
      <div style="flex:1">
        <div style="font-size:${fontSize}px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${badgeHtml}${label}${valHtml ? ' ' + valHtml : ''}</div>
        ${bodyHtml}
      </div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:grid;grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows2},1fr);gap:12px">
    ${cards}
  </div>`;
  return baseHtml(def.title, body);
}

/** タイムライン */
export function renderTimeline(def: SlideDef): string {
  const events: Array<{year:string;label:string;highlight?:boolean}> =
    Array.isArray(def.data.events) ? def.data.events as typeof events : [];
  const n = events.length;

  const cols = Math.min(n, 2);
  const evFontSize = n <= 4 ? 60 : n <= 6 ? 52 : 40;
  const titleFS = def.title.length > 22 ? 48 : 56;

  const cards = events.map((e) => {
    const highlight = !!e.highlight;
    const topColor  = highlight ? C.accent : '#808080';
    return `
    <div style="border:1px solid rgba(0,0,0,0.12);border-top:4px solid ${topColor};border-radius:2px;background:#fafafa;padding:24px 30px;display:flex;flex-direction:column;justify-content:center">
      <div style="font-size:20px;font-weight:800;color:${topColor};letter-spacing:3px;font-family:'Noto Sans JP',sans-serif;margin-bottom:12px;text-transform:uppercase">${escHtml(e.year)}</div>
      <div style="height:1px;background:rgba(0,0,0,0.10);margin-bottom:16px"></div>
      <div style="font-size:${evFontSize}px;font-weight:700;color:${highlight ? C.heading : C.muted};line-height:1.35;font-family:'Noto Sans JP',sans-serif">${escHtml(e.label)}</div>
    </div>`;
  }).join('');

  const gridCss = `display:grid;grid-template-columns:repeat(${cols},1fr);grid-auto-rows:1fr;gap:12px`;

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;${gridCss}">
    ${cards}
  </div>`;
  return baseHtml(def.title, body);
}

/** 比較テーブル */
export function renderTable(def: SlideDef): string {
  const cols: string[] = Array.isArray(def.data.columns) ? def.data.columns as string[] : [];
  const rows: Array<{label:string;values:string[]}> =
    Array.isArray(def.data.rows) ? def.data.rows as typeof rows : [];

  const contentH = SLIDE_H - 200 - 48;
  const totalRows = rows.length + 1;
  const rowH     = Math.floor(contentH / totalRows);
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
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:48px;overflow:hidden;border-radius:8px;border:1px solid ${C.border}">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <thead>${header}</thead>
      <tbody>${bodyRows}</tbody>
    </table>
  </div>`;
  return baseHtml(def.title || '比較', body);
}
