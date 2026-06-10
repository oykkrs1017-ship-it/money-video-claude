/** html-slides/renderers/data.ts — data-table / radial / step-flow + layout utilities */

import { C, SLIDE_W, SLIDE_H } from '../context';
import { escHtml, baseHtml, clampToPalette } from '../utils';
import type { SlideDef } from '../types';

// ─── フォントサイズテーブル ────────────────────────────────────────────────────

export const FS_TABLE = {
  kpi:     [72, 60, 50, 44, 36],
  title:   [56, 48, 42, 38, 36],
  subtitle:[44, 40, 38, 36, 36],
  body:    [40, 36, 36, 36, 36],
  caption: [16, 14, 13, 12, 11],
} as const;

export function fsize(cat: keyof typeof FS_TABLE, cols: number): number {
  return FS_TABLE[cat][Math.min(Math.max(cols - 1, 0), 4)];
}

// ─── レイアウトゾーン ─────────────────────────────────────────────────────────

export interface Zone { top:number; left:number; right:number; bottom:number; width:number; height:number; }
export interface LayoutZones {
  header: Zone;
  main: Zone;
  cols: Zone[];
  topBand?: Zone;
  bottomBar?: Zone;
  sidebar?: Zone;
}

export function applyLayout(opts: {
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

// ─── レンダラー ───────────────────────────────────────────────────────────────

/** 多列データテーブル (競合スタイル: ブルーヘッダー + セル別カラー) */
export function renderDataTable(def: SlideDef): string {
  type ColDef  = { label: string; color?: string; highlight?: boolean };
  type CellDef = { value: string; color?: string; bold?: boolean };

  const rawCols = Array.isArray(def.data.columns) ? def.data.columns as Array<string | ColDef> : [];
  const cols: ColDef[] = rawCols.map(c => typeof c === 'string' ? { label: c } : c);
  const rawRows = Array.isArray(def.data.rows)
    ? def.data.rows as Array<{ label: string; labelColor?: string; cells: Array<string | CellDef> }>
    : [];
  const rows = rawRows.map(r => ({
    label: r.label,
    labelColor: r.labelColor ?? '',
    cells: (r.cells ?? []).map(c => typeof c === 'string' ? { value: c } : c) as CellDef[],
  }));

  const labelHeader = String(def.data.labelHeader ?? '');
  const subtitle    = String(def.data.subtitle ?? '');
  const note        = String(def.data.note ?? '');
  const leadText    = String(def.data.leadText ?? '');

  const totalCols  = cols.length + 1;
  const totalRows  = rows.length + 1;
  const titleAreaH = subtitle ? (leadText ? 345 : 225) : (leadText ? 305 : 185);
  const noteH      = note ? 50 : 0;
  const contentH   = SLIDE_H - titleAreaH - noteH - 40;
  const rowH       = Math.max(58, Math.floor(contentH / totalRows));

  const baseFS  = Math.max(18, Math.min(48, Math.floor(rowH * 0.32)));
  const fs      = totalCols >= 7 ? Math.max(15, baseFS - (totalCols - 6) * 2) : baseFS;
  const headerH = rowH;

  const thBase  = `background:${C.accent};color:#fff;font-size:${fs + 1}px;font-weight:700;`
                + `padding:10px 14px;text-align:center;vertical-align:middle;`
                + `height:${headerH}px;border:none`;
  const headerRow = `<tr>
    <th style="${thBase};text-align:left;padding-left:20px">${escHtml(labelHeader)}</th>
    ${cols.map(c => {
      const hl = c.highlight ? `;background:${C.accent2}` : '';
      const badge = c.highlight
        ? `<div style="display:inline-block;font-size:${Math.max(14, fs - 4)}px;background:rgba(255,255,255,0.20);color:#fff;border-radius:6px;padding:2px 12px;margin-top:6px;letter-spacing:0.5px">推奨</div>`
        : '';
      return `<th style="${thBase}${hl}">${escHtml(c.label)}${badge ? '<br>' + badge : ''}</th>`;
    }).join('')}
  </tr>`;

  const tdBase      = `font-size:${fs}px;padding:9px 13px;text-align:center;vertical-align:middle;`
                    + `height:${rowH}px;border-bottom:1px solid ${C.border}`;
  const labelTdBase = `${tdBase};background:#ffffff;color:${C.heading};font-weight:700;text-align:left;padding-left:18px`;

  const dataRows = rows.map((r) => {
    const labelStyle = r.labelColor
      ? `${labelTdBase};color:${clampToPalette(r.labelColor)}`
      : labelTdBase;
    return `<tr>
      <td style="${labelStyle}">${escHtml(r.label)}</td>
      ${r.cells.map((cell, ci) => {
        const isHlCol = cols[ci]?.highlight === true;
        const fg = cell.color
          ? (clampToPalette(cell.color) ?? C.text)
          : (cell.value === 'なし' || cell.value === '—' || cell.value === '-')
            ? C.muted : C.text;
        const fw = (cell.bold || isHlCol) ? '700' : '400';
        const hlBg  = isHlCol ? `background:${C.lightFill};` : 'background:#fff;';
        return `<td style="${tdBase};${hlBg}color:${fg};font-weight:${fw}">${escHtml(cell.value)}</td>`;
      }).join('')}
    </tr>`;
  }).join('');

  const subtitleHtml = subtitle
    ? `<div style="font-size:26px;color:${C.muted};margin-top:6px;font-weight:700;letter-spacing:0">${escHtml(subtitle)}</div>`
    : '';
  const noteHtml = note
    ? `<div style="position:absolute;bottom:18px;left:72px;right:72px;font-size:21px;color:${C.muted};text-align:right">${escHtml(note)}</div>`
    : '';

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title || 'データ')}</div>
    ${subtitleHtml}
    <div class="accent-line"></div>
    ${leadText ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText)}</div>` : ''}
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${titleAreaH}px;bottom:${noteH + 38}px;overflow:hidden;border-radius:8px;border:1px solid ${C.border}">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <thead>${headerRow}</thead>
      <tbody>${dataRows}</tbody>
    </table>
  </div>
  ${noteHtml}`;
  return baseHtml(def.title || 'データ', body);
}

/** 放射状スプレッド */
export function renderRadial(def: SlideDef): string {
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
export function renderStepFlow(def: SlideDef): string {
  const steps: Array<{title:string;description?:string}> =
    Array.isArray(def.data.steps) ? def.data.steps as typeof steps : [];
  const n = steps.length;

  const COLORS = ['#0a72ef','#7c3aed','#059669','#d97706','#dc2626'];
  const titleFS = def.title.length > 22 ? 48 : 56;

  const cards = steps.map((s, i) => {
    const color = COLORS[i % COLORS.length];
    const numLabel = String(i + 1).padStart(2, '0');
    const isLast = i === n - 1;
    return `
    <div style="display:flex;gap:24px;flex:1;min-height:0">
      <div style="flex-shrink:0;display:flex;flex-direction:column;align-items:center">
        <div style="width:48px;height:48px;border-radius:4px;background:${color};display:flex;align-items:center;justify-content:center;flex-shrink:0">
          <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:2px;font-family:'Noto Sans JP',sans-serif">${numLabel}</span>
        </div>
        ${!isLast ? `<div style="flex:1;width:2px;background:rgba(0,0,0,0.10);margin-top:8px"></div>` : ''}
      </div>
      <div style="flex:1;border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-radius:2px;background:#fafafa;padding:22px 32px;margin-bottom:${isLast?0:16}px;display:flex;flex-direction:column;justify-content:center">
        <div style="font-size:${n>4?22:26}px;font-weight:700;color:${C.heading};margin-bottom:${s.description?10:0}px;line-height:1.3;font-family:'Noto Sans JP',sans-serif">${escHtml(s.title)}</div>
        ${s.description ? `<div style="font-size:${n>4?18:21}px;color:${C.muted};line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(s.description)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:flex;flex-direction:column">
    ${cards}
  </div>`;
  return baseHtml(def.title, body);
}
