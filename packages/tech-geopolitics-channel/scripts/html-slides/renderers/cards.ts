/** html-slides/renderers/cards.ts — feature-matrix / highlight-checklist / ranked-cards / stacked-share */

import { C, SLIDE_W, SLIDE_H, FONT } from '../context';
import { escHtml, baseHtml, clampToPalette } from '../utils';
import type { SlideDef } from '../types';
import { renderStat } from './basic';

// ─── ★ 推奨ハイライト型① — ポジショニングマトリクス ─────────────────────────

/** 2×2 散布図。highlight:true のバブルをグロー+スター強調 */
export function renderFeatureMatrix(def: SlideDef): string {
  type Item = { label: string; x: number; y: number; highlight?: boolean; note?: string; color?: string };
  const items: Item[] = Array.isArray(def.data.items) ? def.data.items as Item[] : [];
  if (items.length === 0) return renderStat(def);

  const xLabel  = String(def.data.xLabel ?? '');
  const yLabel  = String(def.data.yLabel ?? '');
  const footer  = String(def.data.footer ?? '');
  const qLabels = Array.isArray(def.data.quadrantLabels) ? def.data.quadrantLabels as [string, string, string, string] : ['', '', '', ''];

  const SX = 820, SY = 760;
  const PAD = 72;
  const innerW = SX - PAD * 2;
  const innerH = SY - PAD * 2;

  const toSvgX = (pct: number) => PAD + (pct / 100) * innerW;
  const toSvgY = (pct: number) => PAD + ((100 - pct) / 100) * innerH;

  const circles = items.map(item => {
    const cx = toSvgX(item.x);
    const cy = toSvgY(item.y);
    const col = item.highlight ? C.accent : (item.color ?? '#6b7280');
    const r   = item.highlight ? 36 : 28;

    const labelAbove = cy > PAD + r + 60;
    const labelY = labelAbove
      ? cy - r - (item.highlight ? 42 : 12)
      : cy + r + 32;

    const glowFilter = item.highlight
      ? `<filter id="glow"><feGaussianBlur stdDeviation="8" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`
      : '';
    const filterAttr = item.highlight ? ' filter="url(#glow)"' : '';
    const starBadge  = item.highlight
      ? `<text x="${cx}" y="${cy - r - 14}" text-anchor="middle" font-size="24" fill="${C.accent}">★</text>`
      : '';
    const noteText = item.note
      ? `<text x="${cx}" y="${labelAbove ? cy + r + 26 : cy - r - 10}" text-anchor="middle" font-size="18" fill="${C.muted}" font-family="Noto Sans JP">${escHtml(item.note)}</text>`
      : '';

    return `${glowFilter}
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="${col}" opacity="${item.highlight ? 1 : 0.75}"${filterAttr}/>
      <text x="${cx}" y="${labelY}" text-anchor="middle" font-size="${item.highlight ? 26 : 22}" font-weight="700" fill="${item.highlight ? C.accent2 : C.heading}" font-family="Noto Sans JP">${escHtml(item.label)}</text>
      ${starBadge}${noteText}`;
  }).join('');

  const qlFS = 20;
  const quadHtml = qLabels.filter(q => q).length > 0 ? `
    <text x="${PAD + 12}" y="${PAD + 28}" font-size="${qlFS}" fill="${C.dim}" font-family="Noto Sans JP" opacity="0.8">${escHtml(qLabels[0])}</text>
    <text x="${SX - PAD - 12}" y="${PAD + 28}" font-size="${qlFS}" fill="${C.dim}" font-family="Noto Sans JP" text-anchor="end" opacity="0.8">${escHtml(qLabels[1])}</text>
    <text x="${PAD + 12}" y="${SY - PAD - 12}" font-size="${qlFS}" fill="${C.dim}" font-family="Noto Sans JP" opacity="0.8">${escHtml(qLabels[2])}</text>
    <text x="${SX - PAD - 12}" y="${SY - PAD - 12}" font-size="${qlFS}" fill="${C.dim}" font-family="Noto Sans JP" text-anchor="end" opacity="0.8">${escHtml(qLabels[3])}</text>
  ` : '';

  const midX = PAD + innerW / 2;
  const midY = PAD + innerH / 2;

  const svgHtml = `
  <svg width="${SX}" height="${SY}" viewBox="0 0 ${SX} ${SY}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse" x="${PAD}" y="${PAD}">
        <path d="M 80 0 L 0 0 0 80" fill="none" stroke="rgba(0,0,0,0.06)" stroke-width="1"/>
      </pattern>
    </defs>
    <rect x="${PAD}" y="${PAD}" width="${innerW}" height="${innerH}" fill="url(#grid)" rx="8"/>
    <line x1="${midX}" y1="${PAD}" x2="${midX}" y2="${PAD + innerH}" stroke="rgba(0,0,0,0.15)" stroke-width="2" stroke-dasharray="6,4"/>
    <line x1="${PAD}" y1="${midY}" x2="${PAD + innerW}" y2="${midY}" stroke="rgba(0,0,0,0.15)" stroke-width="2" stroke-dasharray="6,4"/>
    ${quadHtml}
    ${circles}
  </svg>`;

  const axisLabels = `
  <div style="position:absolute;bottom:${footer ? 70 : 48}px;left:50%;transform:translateX(-50%);font-size:22px;color:${C.muted};font-weight:700;white-space:nowrap">${escHtml(xLabel)}</div>
  <div style="position:absolute;left:0;top:50%;width:240px;transform:translate(-90px,-50%) rotate(-90deg);font-size:22px;color:${C.muted};font-weight:700;white-space:nowrap;text-align:center">${escHtml(yLabel)}</div>`;

  const footerHtml = footer
    ? `<div style="position:absolute;bottom:20px;left:72px;right:72px;font-size:20px;color:${C.muted};text-align:right">${escHtml(footer)}</div>`
    : '';

  const leadText = String(def.data.leadText ?? '');
  const body = `
  <div style="position:absolute;left:72px;top:52px;right:72px">
    <div class="slide-h1">${escHtml(def.title || 'ポジショニングマトリクス')}</div>
    <div class="accent-line"></div>
    ${leadText ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText)}</div>` : ''}
  </div>
  <div style="position:absolute;left:50%;top:${leadText ? 280 : 140}px;transform:translateX(-50%)">
    ${svgHtml}
  </div>
  ${axisLabels}
  ${footerHtml}`;
  return baseHtml(def.title || 'マトリクス', body);
}

// ─── ★ 推奨ハイライト型② — 特徴チェックリスト ────────────────────────────────

/** 推奨列を色・バッジ・背景で強調する特徴比較表 */
export function renderHighlightChecklist(def: SlideDef): string {
  type ColDef = { label: string; recommended?: boolean; badge?: string; badgeColor?: string };
  type RowDef = { label: string; values: string[] };

  const cols: ColDef[] = Array.isArray(def.data.columns) ? def.data.columns as ColDef[] : [];
  const rows: RowDef[] = Array.isArray(def.data.rows)    ? def.data.rows    as RowDef[] : [];
  const note = String(def.data.note ?? '');

  if (cols.length === 0) return renderStat(def);

  const recIdx = cols.findIndex(c => c.recommended);
  const titleAreaH = 185;
  const noteH      = note ? 50 : 0;
  const totalRows  = rows.length + 1;
  const BOTTOM_GAP   = 50;
  const BORDER_PX    = totalRows * 2;
  const HEADER_EXTRA = 24;
  const containerH   = SLIDE_H - titleAreaH - noteH - BOTTOM_GAP - BORDER_PX;
  const rowH         = Math.max(50, Math.floor((containerH - HEADER_EXTRA) / totalRows));
  const fs           = Math.max(18, Math.min(36, Math.floor(rowH * 0.30)));
  const headerH      = rowH + HEADER_EXTRA;

  const colW = `${100 / (cols.length + 1)}%`;

  const headerCells = cols.map((c, i) => {
    const isRec = i === recIdx;
    const badgeColor = c.badgeColor ?? '#059669';
    const bg    = isRec ? C.accent : C.dark;
    const badge = (isRec && c.badge)
      ? `<div style="display:inline-block;font-size:${Math.max(14, fs - 4)}px;background:${badgeColor};color:#fff;border-radius:20px;padding:3px 14px;margin-top:6px;font-weight:700">${escHtml(c.badge)}</div>`
      : '';
    const crownHtml = isRec ? `<div style="font-size:${fs}px;margin-bottom:4px">👑</div>` : '';
    return `<th style="background:${bg};color:#fff;font-size:${fs}px;font-weight:700;padding:12px 10px;text-align:center;vertical-align:middle;height:${headerH}px;border:1px solid rgba(255,255,255,0.12);width:${colW}">
      ${crownHtml}${escHtml(c.label)}<br>${badge}
    </th>`;
  }).join('');

  const dataRows = rows.map((r, ri) => {
    const evenBg = ri % 2 === 1 ? '#f8fafc' : '#fff';
    const cells = r.values.map((v, ci) => {
      const isRec = ci === recIdx;
      const isCheck  = v === '✓' || v === '○';
      const isCross  = v === '✗' || v === '×' || v === 'なし' || v === '—';
      const fg = isCheck ? '#059669' : isCross ? '#9ca3af' : C.text;
      const fw = isRec ? '700' : '400';
      const bg = isRec
        ? `background:#eff6ff;border-left:3px solid ${C.accent};border-right:3px solid ${C.accent};`
        : `background:${evenBg};`;
      const displayV = isCheck ? `<span style="font-size:${fs + 8}px;color:#059669">✓</span>` : isCross ? `<span style="font-size:${fs + 8}px;color:#d1d5db">✗</span>` : escHtml(v);
      return `<td style="font-size:${fs}px;padding:9px 10px;text-align:center;vertical-align:middle;height:${rowH}px;border:1px solid ${C.border};${bg}color:${fg};font-weight:${fw}">${displayV}</td>`;
    }).join('');
    return `<tr>
      <td style="font-size:${fs}px;padding:9px 16px;text-align:left;vertical-align:middle;height:${rowH}px;border:1px solid ${C.border};background:${C.dark};color:#fff;font-weight:700;width:${colW}">${escHtml(r.label)}</td>
      ${cells}
    </tr>`;
  }).join('');

  const noteHtml = note
    ? `<div style="position:absolute;bottom:18px;left:72px;right:72px;font-size:21px;color:${C.muted};text-align:right">${escHtml(note)}</div>`
    : '';

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title || '特徴比較')}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${titleAreaH}px;bottom:${noteH + BOTTOM_GAP}px;border-radius:12px;box-shadow:0 0 0 1px ${C.border};overflow:hidden">
    <table style="width:100%;border-collapse:collapse;table-layout:fixed">
      <thead><tr>
        <th style="background:${C.dark};color:#fff;font-size:${fs}px;font-weight:700;padding:12px 16px;text-align:left;vertical-align:middle;height:${headerH}px;border:1px solid rgba(255,255,255,0.12);width:${colW}">比較項目</th>
        ${headerCells}
      </tr></thead>
      <tbody>${dataRows}</tbody>
    </table>
  </div>
  ${noteHtml}`;
  return baseHtml(def.title || '特徴比較', body);
}

// ─── ★ 推奨ハイライト型③ — ランキングカード ─────────────────────────────────

/** 横並びカード + 推奨をglow枠+バッジで強調 */
export function renderRankedCards(def: SlideDef): string {
  type Card = { rank?: number; label: string; badge?: string; badgeColor?: string; highlight?: boolean; points?: string[]; color?: string };
  const cards: Card[] = Array.isArray(def.data.cards) ? def.data.cards as Card[] : [];
  const footer = String(def.data.footer ?? '');
  if (cards.length === 0) return renderStat(def);

  const n = cards.length;

  const cardHtmlList = cards.map(card => {
    const isHl = card.highlight === true;
    const headerBg = isHl ? C.accent : (card.color ?? C.dark);
    const rankFS   = n <= 3 ? 64 : 52;
    const labelFS  = n <= 3 ? 48 : 36;
    const pointFS  = n <= 3 ? 36 : 28;
    const badgeFS  = n <= 3 ? 22 : 18;
    const rankBadge = card.rank !== undefined
      ? `<div style="font-size:${rankFS}px;font-weight:700;color:${isHl ? 'rgba(255,255,255,0.9)' : '#9ca3af'};line-height:1">No.${card.rank}</div>`
      : '';
    const hlBadge = (isHl && card.badge)
      ? `<div style="display:inline-block;font-size:${badgeFS}px;background:${card.badgeColor ?? '#d97706'};color:#fff;border-radius:20px;padding:6px 20px;font-weight:700;margin-top:10px">${escHtml(card.badge)}</div>`
      : '';
    const pointList = card.points ?? [];
    const points = pointList.map(p =>
      `<li style="font-size:${pointFS}px;color:${C.text};line-height:1.5;list-style:none;display:flex;align-items:center;gap:12px;border-bottom:1px solid ${C.border};padding:0 0 4px">
        <span style="color:${isHl ? C.accent : C.muted};flex-shrink:0">▶</span><span>${escHtml(p)}</span>
      </li>`
    ).join('');

    const border  = isHl ? `border:3px solid ${C.accent};box-shadow:0 0 40px rgba(10,114,239,0.28)` : `border:1px solid ${C.border}`;
    const glowTop = isHl ? `<div style="position:absolute;top:0;left:0;right:0;height:8px;background:linear-gradient(90deg,${C.accent},${C.accent2});border-radius:12px 12px 0 0"></div>` : '';

    return `<div style="position:relative;border-radius:12px;overflow:hidden;${border};flex:1;display:flex;flex-direction:column">
      ${glowTop}
      <div style="background:${headerBg};padding:36px 28px;text-align:center">
        ${rankBadge}
        <div style="font-size:${labelFS}px;font-weight:700;color:#fff;margin-top:10px">${escHtml(card.label)}</div>
        ${hlBadge}
      </div>
      <div style="padding:28px 28px;background:#fff;flex:1;display:flex;flex-direction:column">
        <ul style="margin:0;padding:0;width:100%;flex:1;display:flex;flex-direction:column;justify-content:space-evenly">${points}</ul>
      </div>
    </div>`;
  }).join('');

  const footerHtml = footer
    ? `<div style="position:absolute;bottom:18px;left:72px;right:72px;font-size:21px;color:${C.muted};text-align:right">${escHtml(footer)}</div>`
    : '';

  const leadText = String(def.data.leadText ?? '');
  const body = `
  <div style="position:absolute;left:72px;top:52px;right:72px">
    <div class="slide-h1">${escHtml(def.title || 'ランキング比較')}</div>
    <div class="accent-line"></div>
    ${leadText ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText)}</div>` : ''}
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${leadText ? 300 : 180}px;bottom:${footer ? 70 : 40}px;display:flex;gap:28px;align-items:stretch">
    ${cardHtmlList}
  </div>
  ${footerHtml}`;
  return baseHtml(def.title || 'ランキング比較', body);
}

// ─── ★ 積み上げ棒グラフ型 ────────────────────────────────────────────────────

/** 積み上げ棒グラフ + 特定セグメント強調コールアウト */
export function renderStackedShare(def: SlideDef): string {
  type SegDef = { label: string; color?: string; values: number[] };
  const xLabels: string[]  = Array.isArray(def.data.xLabels) ? def.data.xLabels as string[] : [];
  const segments: SegDef[] = Array.isArray(def.data.segments) ? def.data.segments as SegDef[] : [];
  if (xLabels.length === 0 || segments.length === 0) return renderStat(def);

  const insight          = String(def.data.insight ?? '');
  const highlightSegment = String(def.data.highlightSegment ?? '');
  const unit             = String(def.data.unit ?? '');
  const note             = String(def.data.note ?? '');
  const hasInsight       = insight.length > 0;

  const chartRight = hasInsight ? SLIDE_W - 72 - 540 - 40 : SLIDE_W - 72;

  const datasets = segments.map((seg, i) => ({
    label:           seg.label,
    data:            seg.values,
    backgroundColor: seg.color ?? C.chartPalette[i % C.chartPalette.length],
    borderRadius:    0,
    stack:           'stack',
  }));

  const chartCfg = JSON.stringify({
    type: 'bar',
    data: { labels: xLabels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: { color: C.muted, font: { size: 20, family: 'Noto Sans JP', weight: '700' }, padding: 20, boxWidth: 18 },
        },
        tooltip: {
          backgroundColor: '#171717', titleColor: '#fff', bodyColor: '#ccc', padding: 14, cornerRadius: 8,
          callbacks: { label: (ctx: { dataset: { label: string }; parsed: { y: number } }) => ` ${ctx.dataset.label}: ${ctx.parsed.y}${unit}` },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { color: C.muted, font: { size: 26, family: 'Noto Sans JP', weight: '700' } },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
        y: {
          stacked: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { color: C.muted, font: { size: 22, family: 'Noto Sans JP' }, callback: (v: number) => `${v}${unit}` },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
      },
    },
  });

  const hlSeg = segments.find(s => s.label === highlightSegment);
  const calloutScript = (hlSeg && hlSeg.values.length > 0) ? `
    const lastIdx = ${xLabels.length - 1};
    const hlDatasetIdx = ${segments.findIndex(s => s.label === highlightSegment)};
    if (hlDatasetIdx >= 0 && chart.getDatasetMeta) {
      try {
        const meta = chart.getDatasetMeta(hlDatasetIdx);
        if (meta && meta.data && meta.data[lastIdx]) {
          const bar  = meta.data[lastIdx];
          const bx   = bar.x;
          const btop = bar.y;
          const cv   = document.getElementById('stackedAnnotation');
          if (cv) {
            const sctx = cv.getContext('2d');
            const wrap = document.getElementById('chartWrapStacked');
            cv.width  = wrap.offsetWidth;
            cv.height = wrap.offsetHeight;
            const adjX = bx;
            const adjY = btop;
            const hlLabel = ${JSON.stringify(highlightSegment)};
            sctx.font = 'bold 20px Noto Sans JP';
            const textW = Math.max(100, sctx.measureText(hlLabel).width);
            const boxW  = textW + 32;
            const boxH  = 44;
            const boxX  = Math.max(4, Math.min(cv.width - boxW - 4, adjX - boxW / 2));
            const boxY  = Math.max(4, adjY - boxH - 16);
            sctx.strokeStyle = '${C.accent}';
            sctx.lineWidth = 2;
            sctx.setLineDash([4,3]);
            sctx.beginPath();
            sctx.moveTo(adjX, adjY);
            sctx.lineTo(adjX, boxY + boxH);
            sctx.stroke();
            sctx.setLineDash([]);
            sctx.fillStyle = '${C.accent}';
            sctx.beginPath();
            sctx.roundRect(boxX, boxY, boxW, boxH, 8);
            sctx.fill();
            sctx.fillStyle = '#fff';
            sctx.textAlign = 'center';
            sctx.fillText(hlLabel, boxX + boxW / 2, boxY + 28);
          }
        }
      } catch(e) { console.warn('[stacked-chart] callout draw error:', e); }
    }
  ` : '';

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title || '推移')}</div>
    <div class="accent-line"></div>
  </div>
  <div id="chartWrapStacked" style="position:absolute;left:72px;right:${SLIDE_W - chartRight}px;top:180px;bottom:${note ? 70 : 50}px">
    <canvas id="stackedChart"></canvas>
    <canvas id="stackedAnnotation" style="position:absolute;inset:0;pointer-events:none"></canvas>
  </div>
  ${hasInsight ? `
  <div style="position:absolute;right:72px;width:520px;top:200px;bottom:${note ? 70 : 60}px;display:flex;flex-direction:column;justify-content:center;gap:24px;padding:48px 44px;background:rgba(10,114,239,0.04);border:1px solid rgba(10,114,239,0.14);border-left:4px solid ${C.accent};border-radius:12px">
    <div style="font-size:11px;font-weight:700;color:${C.accent};letter-spacing:3px">KEY INSIGHT</div>
    <div style="width:36px;height:2px;background:${C.accent};border-radius:1px"></div>
    <div style="font-size:28px;color:${C.heading};line-height:1.65;font-family:${FONT};font-weight:700">${escHtml(insight)}</div>
  </div>` : ''}
  ${note ? `<div style="position:absolute;bottom:20px;left:72px;right:72px;font-size:21px;color:${C.muted};text-align:right">${escHtml(note)}</div>` : ''}
  <script>
    window.addEventListener('load',()=>{
      const canvas = document.getElementById('stackedChart');
      const ctx = canvas.getContext('2d');
      const chart = new Chart(ctx, ${chartCfg});
      ${calloutScript}
    });
  </script>`;
  return baseHtml(def.title || '推移', body);
}
