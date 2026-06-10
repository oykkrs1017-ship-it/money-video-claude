/** html-slides/renderers/panels.ts — renderPane / dual-panel / triple-panel / stat-grid */

import { C } from '../context';
import { escHtml, baseHtml, renderBadge, fmtTrend } from '../utils';
import type { SlideDef, PaneSpec } from '../types';

/** Pane を1つの inner HTML 断片に変換（外側枠は親が用意） */
export function renderPane(p: PaneSpec, accent: string, opts: { compact?: boolean; chartId?: string } = {}): { html: string; script?: string } {
  const compact = !!opts.compact;
  const titleHtml = p.title ? `<div style="font-size:${compact ? 32 : 38}px;font-weight:700;color:${C.heading};letter-spacing:-0.5px;line-height:1.3;font-family:'Noto Sans JP',sans-serif;margin-bottom:14px;padding-bottom:10px;border-bottom:3px solid ${accent}">${escHtml(p.title)}</div>` : '';

  if (p.kind === 'stat') {
    const valueFS = compact ? 140 : 180;
    const labelFS = compact ? 30 : 36;
    const descFS  = compact ? 26 : 30;
    const trendHtml = p.trend !== undefined ? `<div style="margin-top:10px;font-size:${descFS}px">${fmtTrend(p.trend)}</div>` : '';
    const descHtml  = p.description ? `<div style="margin-top:16px;font-size:${descFS}px;color:${C.muted};line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(p.description)}</div>` : '';
    const html = `${titleHtml}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:flex-start">
        <div style="display:flex;align-items:baseline;gap:10px;color:${accent}">
          <div style="font-size:${valueFS}px;font-weight:800;font-family:'Noto Sans JP',sans-serif;line-height:1;letter-spacing:-4px">${escHtml(p.value ?? '')}</div>
          ${p.unit ? `<div style="font-size:${Math.round(valueFS * 0.4)}px;font-weight:700;font-family:'Noto Sans JP',sans-serif">${escHtml(p.unit)}</div>` : ''}
        </div>
        ${p.label ? `<div style="margin-top:14px;font-size:${labelFS}px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${escHtml(p.label)}</div>` : ''}
        ${trendHtml}
        ${descHtml}
      </div>`;
    return { html };
  }

  if (p.kind === 'rich') {
    const pts = (p.points ?? []).map(x => typeof x === 'string' ? { text: x } : x);
    const n = pts.length;
    const totalChars = pts.reduce((s, pt) => s + (pt.text?.length ?? 0) + ((pt as {body?:string}).body?.length ?? 0), 0);
    const charsPerRow = totalChars / Math.max(n, 1);
    const densityFactor = Math.max(0.6, Math.min(1.0, 80 / Math.max(charsPerRow, 30)));
    const baseFS = compact ? 38 : 44;
    const itemFS = Math.round(baseFS * densityFactor);
    const bodyFS = Math.round(itemFS * 0.65);
    const rowPadV = n <= 3 ? 18 : n <= 4 ? 12 : 8;

    const rows = pts.map((pt, i) => {
      const numLabel = String(i + 1).padStart(2, '0');
      const ptObj = pt as { text?: string; value?: string; unit?: string; body?: string; badge?: string };
      const valHtml = ptObj.value ? `<span style="color:${accent};font-weight:800;font-family:'Noto Sans JP',sans-serif;margin-left:8px">${escHtml(ptObj.value)}${ptObj.unit ? `<span style="font-size:0.7em;margin-left:2px">${escHtml(ptObj.unit)}</span>` : ''}</span>` : '';
      const bodyHtml = ptObj.body ? `<div style="font-size:${bodyFS}px;color:${C.muted};margin-top:6px;line-height:1.5;font-family:'Noto Sans JP',sans-serif">${escHtml(ptObj.body)}</div>` : '';
      const badgeHtml = ptObj.badge ? renderBadge(ptObj.badge) : '';
      const isLast = i === pts.length - 1;
      return `<div style="flex:1;display:flex;align-items:flex-start;gap:16px;padding:${rowPadV}px 0;${isLast ? '' : `border-bottom:1px solid rgba(0,0,0,0.08);`}min-height:0">
        <div style="flex-shrink:0;font-size:${Math.round(itemFS * 0.45)}px;font-weight:800;color:${accent};letter-spacing:2px;font-family:'Noto Sans JP',sans-serif;padding-top:6px;min-width:34px">${numLabel}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:${itemFS}px;font-weight:700;color:${C.heading};line-height:1.35;font-family:'Noto Sans JP',sans-serif">${badgeHtml}${escHtml(ptObj.text ?? '')}${valHtml}</div>
          ${bodyHtml}
        </div>
      </div>`;
    }).join('');
    const html = `${titleHtml}<div style="flex:1;display:flex;flex-direction:column;justify-content:stretch;min-height:0">${rows}</div>`;
    return { html };
  }

  if (p.kind === 'chart' && p.chartData) {
    const cd = p.chartData;
    const id = opts.chartId ?? `chart-${Math.random().toString(36).slice(2, 9)}`;
    const labels = cd.data.map(d => d.label);
    const values = cd.data.map(d => d.value);
    const max = Math.max(...values);
    const type = cd.chartType === 'line' ? 'line' : 'bar';
    const cfg = JSON.stringify({
      type,
      data: { labels, datasets: [{
        label: cd.title ?? '',
        data: values,
        backgroundColor: type === 'bar'
          ? values.map(v => v === max ? accent : `${accent}40`)
          : `${accent}14`,
        borderColor: type === 'line' ? accent : values.map(v => v === max ? accent : accent),
        borderWidth: type === 'line' ? 3 : 0,
        borderRadius: type === 'bar' ? 4 : 0,
        pointBackgroundColor: accent,
        pointRadius: type === 'line' ? 5 : 0,
        tension: 0.4,
        fill: type === 'line',
      }] },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: C.muted, font: { size: compact ? 18 : 22 } } },
          y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: C.muted, font: { size: compact ? 18 : 22 } } },
        },
      },
    });
    const insightHtml = p.insight ? `<div style="margin-top:16px;padding:18px 22px;background:${accent}0d;border-left:4px solid ${accent};border-radius:4px;font-size:${compact ? 24 : 28}px;color:${C.heading};line-height:1.55;font-family:'Noto Sans JP',sans-serif;font-weight:700">${escHtml(p.insight)}</div>` : '';
    const html = `${titleHtml}
      <div style="flex:1;min-height:0;position:relative">
        <canvas id="${id}"></canvas>
      </div>
      ${insightHtml}`;
    const script = `window.addEventListener('load',()=>{const ctx=document.getElementById('${id}').getContext('2d');new Chart(ctx,${cfg});});`;
    return { html, script };
  }

  if (p.kind === 'image' && p.src) {
    const captionHtml = p.caption ? `<div style="margin-top:10px;font-size:${compact ? 14 : 16}px;color:${C.muted};text-align:center;font-family:'Noto Sans JP',sans-serif">${escHtml(p.caption)}</div>` : '';
    const html = `${titleHtml}
      <div style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden">
        <img src="${escHtml(p.src)}" style="max-width:100%;max-height:100%;object-fit:contain;border-radius:6px"/>
      </div>
      ${captionHtml}`;
    return { html };
  }

  return { html: `<div style="color:${C.muted}">(empty pane)</div>` };
}

/** dual-panel: 2分割（左右並置） */
export function renderDualPanel(def: SlideDef): string {
  const panes = (def.data.panes ?? []) as PaneSpec[];
  const accents = [C.accent, '#dc2626'];
  const themeOverride = (def.data.accents ?? []) as string[];
  const leftAccent  = themeOverride[0] ?? accents[0];
  const rightAccent = themeOverride[1] ?? accents[1];

  const left  = renderPane(panes[0] ?? { kind: 'rich' }, leftAccent,  { compact: true, chartId: 'chart-l' });
  const right = renderPane(panes[1] ?? { kind: 'rich' }, rightAccent, { compact: true, chartId: 'chart-r' });

  const scripts = [left.script, right.script].filter(Boolean).join('\n');
  const scriptTag = scripts ? `<script>${scripts}</script>` : '';

  const titleFS = def.title.length > 22 ? 52 : 64;
  const body = `
  <div style="position:absolute;left:48px;top:32px;right:48px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.2px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:60px;height:4px;background:${C.accent};margin-top:12px"></div>
  </div>
  <div style="position:absolute;left:48px;right:48px;top:160px;bottom:32px;display:grid;grid-template-columns:1fr 1fr;gap:18px">
    <div style="background:#fafafa;border:1px solid rgba(0,0,0,0.10);border-top:5px solid ${leftAccent};border-radius:6px;padding:18px 22px;display:flex;flex-direction:column;overflow:hidden">${left.html}</div>
    <div style="background:#fafafa;border:1px solid rgba(0,0,0,0.10);border-top:5px solid ${rightAccent};border-radius:6px;padding:18px 22px;display:flex;flex-direction:column;overflow:hidden">${right.html}</div>
  </div>
  ${scriptTag}`;
  return baseHtml(def.title, body);
}

/** triple-panel: 3分割（vertical-3 or top-1-bot-2） */
export function renderTriplePanel(def: SlideDef): string {
  const panes = (def.data.panes ?? []) as PaneSpec[];
  const layout = (def.data.layout ?? 'vertical-3') as 'vertical-3' | 'top-1-bot-2';
  const accents = ['#0a72ef', '#7c3aed', '#059669'];

  const rendered = panes.slice(0, 3).map((p, i) => renderPane(p, accents[i], { compact: true, chartId: `chart-t${i}` }));
  const scripts = rendered.map(r => r.script).filter(Boolean).join('\n');
  const scriptTag = scripts ? `<script>${scripts}</script>` : '';

  const titleFS = def.title.length > 22 ? 44 : 52;
  const cell = (i: number) => `<div style="background:#fafafa;border:1px solid rgba(0,0,0,0.10);border-top:4px solid ${accents[i]};border-radius:6px;padding:22px 24px;display:flex;flex-direction:column;overflow:hidden">${rendered[i]?.html ?? ''}</div>`;

  let grid: string;
  if (layout === 'top-1-bot-2') {
    grid = `<div style="position:absolute;left:72px;right:72px;top:170px;bottom:48px;display:grid;grid-template-rows:1.2fr 1fr;grid-template-columns:1fr 1fr;gap:22px">
      <div style="grid-column:1/3">${cell(0)}</div>
      ${cell(1)}
      ${cell(2)}
    </div>`;
  } else {
    grid = `<div style="position:absolute;left:72px;right:72px;top:170px;bottom:48px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:22px">
      ${cell(0)}${cell(1)}${cell(2)}
    </div>`;
  }

  const body = `
  <div style="position:absolute;left:72px;top:48px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.2px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:14px"></div>
  </div>
  ${grid}
  ${scriptTag}`;
  return baseHtml(def.title, body);
}

/** stat-grid: 2×2 KPIグリッド */
export function renderStatGrid(def: SlideDef): string {
  const stats = (def.data.stats ?? []) as Array<{ value: string; unit?: string; label: string; description?: string; trend?: number; color?: string }>;
  const palette = ['#0a72ef', '#dc2626', '#059669', '#d97706'];

  const cells = stats.slice(0, 4).map((s, i) => {
    const color = s.color ?? palette[i];
    const trendHtml = s.trend !== undefined ? `<div style="margin-top:8px;font-size:18px">${fmtTrend(s.trend)}</div>` : '';
    const descHtml  = s.description ? `<div style="margin-top:10px;font-size:16px;color:${C.muted};line-height:1.5;font-family:'Noto Sans JP',sans-serif">${escHtml(s.description)}</div>` : '';
    return `<div style="background:#fafafa;border:1px solid rgba(0,0,0,0.10);border-top:4px solid ${color};border-radius:6px;padding:28px 32px;display:flex;flex-direction:column;justify-content:center;overflow:hidden">
      <div style="display:flex;align-items:baseline;gap:6px;color:${color}">
        <div style="font-size:88px;font-weight:800;font-family:'Noto Sans JP',sans-serif;line-height:1;letter-spacing:-2px">${escHtml(s.value)}</div>
        ${s.unit ? `<div style="font-size:26px;font-weight:700;font-family:'Noto Sans JP',sans-serif">${escHtml(s.unit)}</div>` : ''}
      </div>
      <div style="margin-top:12px;font-size:20px;font-weight:700;color:${C.heading};line-height:1.4;font-family:'Noto Sans JP',sans-serif">${escHtml(s.label)}</div>
      ${trendHtml}
      ${descHtml}
    </div>`;
  }).join('');

  const titleFS = def.title.length > 22 ? 44 : 52;
  const body = `
  <div style="position:absolute;left:72px;top:48px;right:72px">
    <div style="font-size:${titleFS}px;font-weight:700;color:${C.heading};letter-spacing:-1.2px;line-height:1.15;font-family:'Noto Sans JP',sans-serif">${escHtml(def.title)}</div>
    <div style="width:48px;height:3px;background:${C.accent};margin-top:14px"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:170px;bottom:48px;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;gap:22px">
    ${cells}
  </div>`;
  return baseHtml(def.title, body);
}
