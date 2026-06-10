/** html-slides/renderers/list.ts — stacked-list / check-grid / key-message / before-after / kpi-band / two-col / feature-cards / icon-matrix */

import { C, SLIDE_H, SLIDE_W } from '../context';
import { escHtml, baseHtml, pointText } from '../utils';
import type { SlideDef } from '../types';
import { fsize, applyLayout } from './data';

/** [Var-A] スタックリスト — McKinsey ヘアラインカード + 01/02 番号ラベル */
export function renderStackedList(def: SlideDef): string {
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
      ? `<div style="font-size:13px;color:${C.dim};margin-top:12px;padding-top:8px;border-top:1px solid rgba(0,0,0,0.08);font-family:'Noto Sans JP',sans-serif">出典: ${escHtml(p.source)}</div>`
      : '';
    const valHtml = p.value
      ? `<div style="flex-shrink:0;padding:0 36px;display:flex;align-items:center;border-left:1px solid rgba(0,0,0,0.08)">
           <div style="font-size:${valFS}px;font-weight:800;color:${color};line-height:1;font-family:'Noto Sans JP',sans-serif">${escHtml(p.value)}${p.unit ? `<span style="font-size:16px;margin-left:6px">${escHtml(p.unit)}</span>` : ''}</div>
         </div>`
      : '';
    return `
    <div style="flex:1;display:flex;align-items:stretch;border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-left:3px solid ${color};border-radius:2px;background:#fafafa;overflow:hidden">
      <div style="flex-shrink:0;width:88px;display:flex;align-items:center;justify-content:center;border-right:1px solid rgba(0,0,0,0.10)">
        <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Noto Sans JP',sans-serif">${numLabel}</div>
      </div>
      <div style="flex:1;padding:0 40px;display:flex;flex-direction:column;justify-content:center;overflow:hidden">
        <div style="font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${label}</div>
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
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;${gridStyle}">
    ${cardItems}
  </div>`;
  return baseHtml(def.title, body);
}

/** [Var-B] チェックグリッド — McKinsey Key Findings グリッド */
export function renderCheckGrid(def: SlideDef): string {
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
    const cardBase  = `${spanStyle}border:1px solid rgba(0,0,0,0.12);border-top:3px solid ${color};border-radius:2px;background:${C.bg}`;

    if (hasRichData) {
      return `
    <div style="${cardBase};display:flex;flex-direction:column;padding:22px 36px 18px">
      <div style="font-size:${numFS}px;font-weight:700;color:${color};letter-spacing:3px;margin-bottom:10px;font-family:'Noto Sans JP',sans-serif">${numLabel}</div>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:20px;flex:1">
        <div style="flex:1;min-width:0">
          <div style="font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.35;font-family:'Noto Sans JP',sans-serif;margin-bottom:${p.body ? 10 : 0}px">${escHtml(p.text)}</div>
          ${p.body ? `<div style="font-size:${bodyFS}px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif">${escHtml(p.body)}</div>` : ''}
        </div>
        ${p.value ? `
        <div style="flex-shrink:0;text-align:right;margin-left:20px">
          <div style="font-size:${valueFS}px;font-weight:700;color:${color};line-height:1;font-variant-numeric:tabular-nums;font-family:'Noto Sans JP',sans-serif">${escHtml(p.value)}</div>
          ${p.unit ? `<div style="font-size:${unitFS}px;color:${C.muted};margin-top:5px;font-family:'Noto Sans JP',sans-serif">${escHtml(p.unit)}</div>` : ''}
        </div>` : ''}
      </div>
      ${p.source ? `<div style="font-size:${srcFS}px;color:${C.dim};margin-top:14px;padding-top:10px;border-top:1px solid rgba(0,0,0,0.08);font-family:'Noto Sans JP',sans-serif">出典: ${escHtml(p.source)}</div>` : ''}
    </div>`;
    } else {
      return `
    <div style="${cardBase};display:flex;align-items:center;padding:0 36px;gap:28px">
      <div style="flex-shrink:0;font-size:22px;font-weight:800;color:${color};letter-spacing:1px;font-family:'Noto Sans JP',sans-serif;min-width:36px">${numLabel}</div>
      <div style="width:1px;height:44px;background:rgba(0,0,0,0.12);flex-shrink:0"></div>
      <div style="flex:1;font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.45;font-family:'Noto Sans JP',sans-serif">${escHtml(p.text)}</div>
    </div>`;
    }
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:grid;grid-template-columns:repeat(2,1fr);grid-template-rows:repeat(${rows},1fr);gap:12px">
    ${items}
  </div>`;
  return baseHtml(def.title, body);
}

/** [Var-C] キーメッセージ — McKinsey "So What?" ダークバナー */
export function renderKeyMessage(def: SlideDef): string {
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
        <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Noto Sans JP',sans-serif;min-width:28px">${numLabel}</div>
      </div>
      <div style="font-size:${pointFS}px;font-weight:700;color:${C.text};line-height:1.55;flex:1;font-family:'Noto Sans JP',sans-serif">${escHtml(pointText(p))}</div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;top:0;left:8px;right:0;height:${bannerH}px;background:${C.dark};display:flex;align-items:center;padding:0 72px">
    <div style="font-size:${titleFS}px;font-weight:800;color:#ffffff;line-height:1.1;letter-spacing:-1.5px;max-width:1600px;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${bannerH + 40}px;bottom:40px;display:flex;flex-direction:column;justify-content:space-evenly">
    ${bullets}
  </div>`;
  return baseHtml(def.title, body);
}

/** [Var-D] ビフォーアフター — McKinsey シナリオ対比 */
export function renderBeforeAfter(def: SlideDef): string {
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
    <div style="flex-shrink:0;width:52px;background:${C.bg};display:flex;align-items:center;justify-content:center">
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

/** presetKPICards: 上段帯にKPI数値 + 下段にN列カード */
export function renderKpiBand(def: SlideDef): string {
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
      <div style="font-size:18px;color:${C.muted};margin-top:10px;font-weight:700;text-align:center;line-height:1.4">${escHtml(k.label)}</div>
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
  <div style="position:absolute;left:72px;right:72px;top:${zones.topBand!.top}px;height:${bandH}px;display:flex;background:${C.bg};border-radius:16px;box-shadow:0 0 0 1px ${C.border};overflow:hidden">
    ${kpiItems}
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${zones.main.top}px;bottom:${SLIDE_H - zones.main.bottom}px;display:flex;gap:20px">
    ${cardItems}
  </div>`;
  return baseHtml(def.title, body);
}

/** presetTwoCol: 2カラム左右分割 */
export function renderTwoCol(def: SlideDef): string {
  const leftData  = (def.data.left  ?? {}) as {title?:string;points?:string[];body?:string};
  const rightData = (def.data.right ?? {}) as {title?:string;points?:string[];body?:string;stat?:{value:string;unit?:string;label:string}};
  const splitRatio: [number,number] = Array.isArray(def.data.splitRatio) ? (def.data.splitRatio as [number,number]) : [7, 5];

  const zones = applyLayout({ columns: 2, splitRatio });
  const [lZone] = zones.cols;

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
      <div style="margin-top:16px;text-align:center;padding:28px;background:${C.bg};border-radius:16px">
        <div style="font-size:80px;font-weight:900;color:${C.accent};line-height:1;letter-spacing:-2px">${escHtml(rightData.stat.value)}</div>
        ${rightData.stat.unit ? `<div style="font-size:18px;color:${C.muted};margin-top:8px">${escHtml(rightData.stat.unit)}</div>` : ''}
        <div style="font-size:18px;color:${C.muted};margin-top:10px">${escHtml(rightData.stat.label)}</div>
      </div>` : ''}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** presetFeatureCards: N列均等カード */
export function renderFeatureCards(def: SlideDef): string {
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
      <div style="font-size:13px;font-weight:700;color:${color};letter-spacing:3px;font-family:'Noto Sans JP',sans-serif">${numLabel}</div>
      <div style="height:1px;background:rgba(0,0,0,0.10)"></div>
      <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};line-height:1.3;font-family:'Noto Sans JP',sans-serif">${escHtml(c.title)}</div>
      ${c.body ? `<div style="font-size:${bodyFS}px;color:${C.muted};line-height:1.6;font-family:'Noto Sans JP',sans-serif">${escHtml(c.body)}</div>` : ''}
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${slideTitleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:#0a72ef;margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:flex;gap:20px">
    ${cardItems}
  </div>`;
  return baseHtml(def.title, body);
}

/** McKinsey p80: アイコンマトリクス */
export function renderIconMatrix(def: SlideDef): string {
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
      <div style="flex:1;font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.4">${escHtml(pointText(p))}</div>
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
