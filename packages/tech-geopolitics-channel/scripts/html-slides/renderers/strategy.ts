/** html-slides/renderers/strategy.ts — era-split / insight-split / strategy-full / kpi-context / segment-strategy */

import { C } from '../context';
import { escHtml, baseHtml, pointText, resolveColor, renderBadge } from '../utils';
import type { SlideDef } from '../types';

/** McKinsey p20: 2時代分割タイムライン */
export function renderEraSplit(def: SlideDef): string {
  const events: Array<{year:string;label:string;highlight?:boolean}> =
    Array.isArray(def.data.events) ? def.data.events as typeof events : [];

  let leftEvs = events.filter(e => !e.highlight);
  let rightEvs = events.filter(e => !!e.highlight);
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
      <div style="flex:1;font-size:${evFontSize}px;font-weight:700;color:${e.highlight ? C.heading : C.muted};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${escHtml(e.label)}</div>
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

/** McKinsey p30: 左右2列 + 縦仕切り線 */
export function renderInsightSplit(def: SlideDef): string {
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
        <span style="font-size:13px;font-weight:700;color:#fff;letter-spacing:2px;font-family:'Noto Sans JP',sans-serif">${numLabel}</span>
      </div>
      <div style="font-size:${textFS}px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${escHtml(pointText(p))}</div>
    </div>`;
  };

  const leftCards  = leftPts.map((p, i) => makeCard(p, i, 1, i + 1)).join('');
  const rightCards = rightPts.map((p, i) => makeCard(p, mid + i, 3, i + 1)).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.5px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:16px;margin-bottom:32px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:196px;bottom:48px;display:grid;grid-template-columns:1fr 1px 1fr;grid-template-rows:repeat(${rows},1fr);gap:12px 0">
    <div style="grid-column:2;grid-row:1/span ${rows};background:rgba(0,0,0,0.10);width:1px;justify-self:center"></div>
    ${leftCards}
    ${rightCards}
  </div>`;
  return baseHtml(def.title, body);
}

/** strategy-full: 目標バナー + 施策リスト + KPI */
export function renderStrategyFull(def: SlideDef): string {
  const goal        = String(def.data.goal ?? '');
  const env         = Array.isArray(def.data.environment) ? def.data.environment as string[] : [];
  const initiatives = Array.isArray(def.data.initiatives) ? def.data.initiatives as Array<{title:string;body?:string}> : [];
  const kpi         = Array.isArray(def.data.kpi)         ? def.data.kpi as Array<{value:string;label:string;unit?:string}>  : [];

  const goalBanner = goal ? `
  <div style="position:absolute;left:72px;right:72px;top:160px;height:88px;background:${C.accent};border-radius:10px;display:flex;align-items:center;padding:0 40px;gap:20px">
    <div style="flex-shrink:0;font-size:13px;font-weight:800;color:rgba(255,255,255,0.7);letter-spacing:3px">目指す姿</div>
    <div style="width:1px;height:40px;background:rgba(255,255,255,0.3)"></div>
    <div style="font-size:26px;font-weight:700;color:#fff;line-height:1.4;font-family:'Noto Sans JP',sans-serif">${escHtml(goal)}</div>
  </div>` : '';

  const topOffset = goal ? 268 : 180;

  const initItems = initiatives.map((it, i) => `
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div style="flex-shrink:0;width:36px;height:36px;border-radius:50%;background:${C.accent};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;color:#fff;margin-top:2px">${String(i+1).padStart(2,'0')}</div>
      <div>
        <div style="font-size:22px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${escHtml(it.title)}</div>
        ${it.body ? `<div style="font-size:17px;color:${C.muted};margin-top:6px;line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(it.body)}</div>` : ''}
      </div>
    </div>`).join('');

  const envItems = env.map(e => `
    <div style="display:flex;gap:12px;align-items:flex-start">
      <div style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${C.accent};margin-top:10px"></div>
      <div style="font-size:18px;color:${C.muted};line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(e)}</div>
    </div>`).join('');

  const kpiItems = kpi.map(k => `
    <div style="flex:1;background:#fff;border:1px solid rgba(10,114,239,0.2);border-top:3px solid ${C.accent};border-radius:8px;padding:16px 20px;text-align:center">
      <div style="font-size:36px;font-weight:800;color:${C.accent};letter-spacing:-1px;line-height:1">${escHtml(k.value)}<span style="font-size:18px;margin-left:4px;font-weight:700">${escHtml(k.unit ?? '')}</span></div>
      <div style="font-size:14px;color:${C.muted};margin-top:6px;font-family:'Noto Sans JP',sans-serif">${escHtml(k.label)}</div>
    </div>`).join('');

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  ${goalBanner}
  <div style="position:absolute;left:72px;right:72px;top:${topOffset}px;bottom:48px;display:flex;gap:32px">
    <div style="flex:6;display:flex;flex-direction:column;gap:20px;overflow:hidden">
      <div style="font-size:13px;font-weight:800;color:${C.accent};letter-spacing:3px;margin-bottom:4px">重点施策</div>
      <div style="display:flex;flex-direction:column;gap:20px">${initItems}</div>
    </div>
    <div style="flex-shrink:0;width:1px;background:rgba(0,0,0,0.10);align-self:stretch"></div>
    <div style="flex:4;display:flex;flex-direction:column;gap:20px;overflow:hidden">
      ${env.length > 0 ? `
      <div>
        <div style="font-size:13px;font-weight:800;color:${C.muted};letter-spacing:3px;margin-bottom:12px">事業環境</div>
        <div style="display:flex;flex-direction:column;gap:10px">${envItems}</div>
      </div>` : ''}
      ${kpi.length > 0 ? `
      <div style="margin-top:auto">
        <div style="font-size:13px;font-weight:800;color:${C.accent};letter-spacing:3px;margin-bottom:12px">KPI目標</div>
        <div style="display:flex;gap:12px">${kpiItems}</div>
      </div>` : ''}
    </div>
  </div>`;
  return baseHtml(def.title, body);
}

/** kpi-context: KPIバッジ行 + 箇条書き + コンテキスト */
export function renderKpiContext(def: SlideDef): string {
  const kpiItems  = Array.isArray(def.data.kpiItems) ? def.data.kpiItems as Array<{value:string;label:string;unit?:string;color?:string}> : [];
  const bullets   = Array.isArray(def.data.bullets)  ? def.data.bullets  as string[] : [];
  const context   = String(def.data.context ?? '');

  const COLORS = ['#0a72ef','#7c3aed','#059669','#dc2626','#d97706'];

  const kpiBadges = kpiItems.map((k, i) => {
    const col = k.color ?? COLORS[i % COLORS.length];
    return `
    <div style="flex:1;background:#fff;border:1px solid rgba(0,0,0,0.10);border-top:4px solid ${col};border-radius:10px;padding:20px 24px;text-align:center;min-width:0">
      <div style="font-size:48px;font-weight:800;color:${col};letter-spacing:-1.5px;line-height:1">${escHtml(k.value)}<span style="font-size:22px;margin-left:4px;font-weight:700">${escHtml(k.unit ?? '')}</span></div>
      <div style="font-size:15px;color:${C.muted};margin-top:8px;font-family:'Noto Sans JP',sans-serif">${escHtml(k.label)}</div>
    </div>`;
  }).join('');

  const bulletItems = bullets.map(b => `
    <div style="display:flex;gap:16px;align-items:flex-start">
      <div style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${C.accent};margin-top:12px"></div>
      <div style="font-size:24px;color:${C.heading};line-height:1.6;font-family:'Noto Sans JP',sans-serif">${escHtml(b)}</div>
    </div>`).join('');

  const contextPanel = context ? `
    <div style="background:rgba(10,114,239,0.04);border:1px solid rgba(10,114,239,0.14);border-left:4px solid ${C.accent};border-radius:10px;padding:24px 28px">
      <div style="font-size:11px;font-weight:800;color:${C.accent};letter-spacing:3px;margin-bottom:10px">CONTEXT</div>
      <div style="font-size:22px;color:${C.heading};line-height:1.65;font-family:'Noto Sans JP',sans-serif">${escHtml(context)}</div>
    </div>` : '';

  const body = `
  <div style="position:absolute;left:72px;top:56px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:180px;height:160px;display:flex;gap:20px">${kpiBadges}</div>
  <div style="position:absolute;left:72px;right:72px;top:360px;bottom:48px;display:flex;flex-direction:column;gap:20px">
    <div style="display:flex;flex-direction:column;gap:12px">${bulletItems}</div>
    ${contextPanel}
  </div>`;
  return baseHtml(def.title, body);
}

/** segment-strategy: KPI比較行 + 施策リスト + 環境 + 財務バー */
export function renderSegmentStrategy(def: SlideDef): string {
  type KpiRow  = {label:string; current:string; target:string; diff?:string; highlight?:boolean};
  type InitRow = {title:string; detail?:string; highlight?:boolean; badge?:string};
  type FinRow  = {year:string; revenue:string; ebitda:string};

  const sectionLabel = String(def.data.sectionLabel ?? '');
  const tagline      = String(def.data.tagline ?? '');
  const kpiRows      = (Array.isArray(def.data.kpiCompare)   ? def.data.kpiCompare   : []) as KpiRow[];
  const initiatives  = (Array.isArray(def.data.initiatives)  ? def.data.initiatives  : []) as InitRow[];
  const environment  = (Array.isArray(def.data.environment)  ? def.data.environment  : []) as string[];
  const finBar       = (Array.isArray(def.data.financialBar)  ? def.data.financialBar  : []) as FinRow[];

  const hi = '#d84315';

  const header = `
  <div style="position:absolute;left:72px;top:44px;right:72px;display:flex;align-items:center;gap:16px">
    <div style="width:5px;height:36px;background:${C.accent};border-radius:2px;flex-shrink:0"></div>
    ${sectionLabel ? `<div style="background:${C.accent};color:#fff;font-size:12px;font-weight:800;padding:4px 14px;border-radius:4px;letter-spacing:2px">${escHtml(sectionLabel)}</div>` : ''}
    <div style="font-size:26px;font-weight:700;color:${C.heading};letter-spacing:-0.5px;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    ${tagline ? `<div style="margin-left:auto;font-size:18px;color:${C.accent};font-weight:700;font-family:'Noto Sans JP',sans-serif">${escHtml(tagline)}</div>` : ''}
  </div>
  <div style="position:absolute;left:72px;top:100px;right:72px;height:1px;background:rgba(0,0,0,0.08)"></div>`;

  const actionTitle = def.data.actionTitle ? `
  <div style="position:absolute;left:72px;top:114px;right:72px;font-size:22px;font-weight:700;color:${C.heading};line-height:1.45;font-family:'Noto Sans JP',sans-serif;padding:14px 20px;background:rgba(10,114,239,0.04);border-left:4px solid ${C.accent};border-radius:4px">
    ${escHtml(String(def.data.actionTitle))}
  </div>` : '';

  const contentTop = def.data.actionTitle ? 206 : 118;
  const finBarH    = finBar.length > 0 ? 64 : 0;
  const contentBot = 48 + finBarH;

  const initCards = initiatives.map((it, i) => {
    const col = it.highlight ? hi : resolveColor(it.title, C.accent);
    const badgeHtml = it.badge ? renderBadge(it.badge) : '';
    return `
    <div style="display:flex;gap:16px;align-items:flex-start;padding:14px 16px;border-radius:6px;background:#fafafa;border:1px solid rgba(0,0,0,0.08);border-left:3px solid ${col}">
      <div style="flex-shrink:0;width:34px;height:34px;border-radius:50%;background:${col};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;margin-top:1px">${String(i+1).padStart(2,'0')}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:20px;font-weight:700;color:${it.highlight ? hi : C.heading};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${badgeHtml}${escHtml(it.title)}</div>
        ${it.detail ? `<div style="font-size:15px;color:${C.muted};margin-top:5px;line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(it.detail)}</div>` : ''}
      </div>
    </div>`;
  }).join('');

  const kpiCards = kpiRows.map(k => {
    const col = k.highlight ? hi : C.accent;
    return `
    <div style="background:#fff;border:1px solid rgba(0,0,0,0.10);border-top:3px solid ${col};border-radius:8px;padding:12px 16px">
      <div style="font-size:11px;color:${C.muted};font-weight:700;letter-spacing:1px;margin-bottom:6px;font-family:'Noto Sans JP',sans-serif">${escHtml(k.label)}</div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:26px;font-weight:800;color:#999;letter-spacing:-0.5px">${escHtml(k.current)}</span>
        <span style="font-size:16px;color:#ccc">→</span>
        <span style="font-size:32px;font-weight:800;color:${col};letter-spacing:-1px">${escHtml(k.target)}</span>
        ${k.diff ? `<span style="font-size:13px;font-weight:700;color:${col};margin-left:4px">${escHtml(k.diff)}</span>` : ''}
      </div>
    </div>`;
  }).join('');

  const envBlock = environment.length > 0 ? `
  <div style="background:#f5f5f5;border-radius:6px;padding:14px 16px;margin-top:4px">
    <div style="font-size:11px;font-weight:800;color:${C.muted};letter-spacing:3px;margin-bottom:10px">事業環境</div>
    <div style="display:flex;flex-direction:column;gap:8px">
      ${environment.map(e => `
      <div style="display:flex;gap:10px;align-items:flex-start">
        <div style="flex-shrink:0;width:6px;height:6px;border-radius:50%;background:${C.accent};margin-top:8px"></div>
        <div style="font-size:16px;color:${C.text};line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(e)}</div>
      </div>`).join('')}
    </div>
  </div>` : '';

  const finBarHtml = finBar.length > 0 ? `
  <div style="position:absolute;left:0;right:0;bottom:0;height:${finBarH}px;background:#f0f4fa;border-top:1px solid rgba(10,114,239,0.15);display:flex;align-items:center;justify-content:center;gap:0">
    ${finBar.map((f, i) => `
    <div style="display:flex;align-items:center;gap:24px;padding:0 32px;${i < finBar.length-1 ? 'border-right:1px solid rgba(0,0,0,0.10)' : ''}">
      <div style="font-size:12px;font-weight:700;color:${C.muted}">${escHtml(f.year)}</div>
      <div style="font-size:13px;color:${C.heading}">売上 <span style="font-size:17px;font-weight:800;color:${C.accent}">${escHtml(f.revenue)}</span></div>
      <div style="font-size:13px;color:${C.heading}">EBITDA率 <span style="font-size:17px;font-weight:800;color:${C.accent}">${escHtml(f.ebitda)}</span></div>
    </div>`).join('')}
  </div>` : '';

  const body = `
  ${header}
  ${actionTitle}
  <div style="position:absolute;left:72px;right:72px;top:${contentTop}px;bottom:${contentBot}px;display:flex;gap:28px">
    <div style="flex:6;display:flex;flex-direction:column;gap:10px;overflow:hidden">
      <div style="font-size:11px;font-weight:800;color:${C.accent};letter-spacing:3px;margin-bottom:2px">重点施策</div>
      ${initCards}
    </div>
    <div style="flex-shrink:0;width:1px;background:rgba(0,0,0,0.08);align-self:stretch"></div>
    <div style="flex:4;display:flex;flex-direction:column;gap:10px;overflow:hidden">
      <div style="font-size:11px;font-weight:800;color:${C.accent};letter-spacing:3px;margin-bottom:2px">KPI目標</div>
      ${kpiCards}
      ${envBlock}
    </div>
  </div>
  ${finBarHtml}`;

  return baseHtml(def.title, body);
}
