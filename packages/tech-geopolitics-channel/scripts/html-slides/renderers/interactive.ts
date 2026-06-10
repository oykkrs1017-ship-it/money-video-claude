/** html-slides/renderers/interactive.ts — YouTube向けカード / ドーナツ / 棒グラフ差分 */

import { C, SLIDE_W } from '../context';
import { escHtml, baseHtml, clampToPalette } from '../utils';
import type { SlideDef } from '../types';
import { renderStat } from './basic';

// ─── カラーヘルパー ───────────────────────────────────────────────────────────

/** カラープリセット (header色名 → hex) — ガイド3役割へ集約（青=注目/自社・グレー=中立・朱=課題） */
const CARD_COLOR_MAP: Record<string, string> = {
  blue:   '#1976D2',
  green:  '#1976D2',   // ポジティブ → 青へ集約
  red:    '#D84315',   // 課題・対立 → 朱
  gold:   '#1565C0',   // 金は廃止 → 濃ブルー
  navy:   '#1565C0',
  teal:   '#1976D2',
  purple: '#1565C0',
  orange: '#D84315',
};

function cardColor(c: string | undefined, fallback = '#1976D2'): string {
  if (!c) return fallback;
  return CARD_COLOR_MAP[c] ?? clampToPalette(c) ?? fallback;
}

/** 共通: 薄いブルー背景 (競合スライドスタイル) */
function ytSlideBase(title: string, body: string, footer?: string, leadText?: string): string {
  const footerHtml = footer ? `
  <div style="position:absolute;left:72px;right:72px;bottom:28px;background:${C.accent};padding:16px 28px;border-radius:8px;text-align:center">
    <span style="color:#ffffff;font-size:22px;font-family:'Noto Sans JP',sans-serif">${escHtml(footer)}</span>
  </div>` : '';

  const titleHtml = title ? `
  <div style="position:absolute;left:72px;right:72px;top:48px">
    <div style="font-size:50px;font-weight:700;color:${C.heading};font-family:'Noto Sans JP',sans-serif;line-height:1.2">${escHtml(title)}</div>
    <div style="width:56px;height:4px;background:${C.accent};margin-top:14px"></div>
    ${leadText ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText)}</div>` : ''}
  </div>` : '';

  const fullBody = `
  <div style="position:absolute;inset:0;background:#ffffff"></div>
  ${titleHtml}
  ${body}
  ${footerHtml}`;
  return baseHtml(title, fullBody);
}

// ─── レンダラー ───────────────────────────────────────────────────────────────

/** カラーヘッダーカード (2〜3列) */
export function renderColorCards(def: SlideDef): string {
  const cards = (Array.isArray(def.data.cards) ? def.data.cards : []) as Array<{
    header: string; headerColor?: string; icon?: string;
    lines?: string[]; highlight?: string; highlightColor?: string;
  }>;
  const footer = String(def.data.footer ?? '');
  const leadText = String(def.data.leadText ?? '');
  const n = cards.length || 1;
  const hasTitle = !!def.title;
  const top = hasTitle ? (leadText ? 270 : 175) : 64;
  const bottom = footer ? 96 : 32;

  const hdrFS  = n >= 4 ? 30 : n === 3 ? 36 : 44;
  const lineFS = n >= 4 ? 36 : n === 3 ? 44 : 62;
  const hlFS   = n >= 4 ? 44 : n === 3 ? 50 : 80;
  const hdrPad = n >= 4 ? '20px 16px' : '20px 20px';

  const cardItems = cards.map(c => {
    const hc = cardColor(c.headerColor);
    const lines = (c.lines ?? []).map(l =>
      `<div style="font-size:${lineFS}px;color:${C.text};line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(l)}</div>`
    ).join('');
    const hl = c.highlight
      ? `<div style="font-size:${hlFS}px;font-weight:700;color:${clampToPalette(c.highlightColor) ?? '#D84315'};font-family:'Noto Sans JP',sans-serif">${escHtml(c.highlight)}</div>`
      : '';
    return `
    <div style="flex:1;background:#ffffff;border:1px solid ${C.border};border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
      <div style="background:${hc};padding:${hdrPad};text-align:center;flex-shrink:0">
        <div style="color:#ffffff;font-size:${hdrFS}px;font-weight:700;font-family:'Noto Sans JP',sans-serif;line-height:1.3">${escHtml(c.header)}</div>
      </div>
      <div style="flex:1;padding:24px 28px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px">
        <div style="display:flex;flex-direction:column;align-items:center;gap:10px">${lines}</div>
        ${hl}
      </div>
    </div>`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;right:72px;top:${top}px;bottom:${bottom}px;display:flex;gap:20px;align-items:stretch">
    ${cardItems}
  </div>`;
  return ytSlideBase(def.title, body, footer || undefined, leadText || undefined);
}

/** アイコン付きステップフロー (横並び + 矢印) */
export function renderStepIcons(def: SlideDef): string {
  const steps = (Array.isArray(def.data.steps) ? def.data.steps : []) as Array<{
    number?: number; label: string; icon?: string; body?: string; color?: string;
  }>;
  const footer = String(def.data.footer ?? '');
  const leadText = String(def.data.leadText ?? '');
  const n = steps.length || 1;
  const hasTitle = !!def.title;
  const top = hasTitle ? (leadText ? 270 : 175) : 64;
  const bottom = footer ? 96 : 32;
  const arrowColor = '#c8960c';
  const defaultColors = ['#2b5ca8', '#2b5ca8', '#b07c0a', '#1e6e45', '#b07c0a', '#b52b27'];

  const hdrFS  = n >= 5 ? 26 : n === 4 ? 30 : 38;
  const iconFS = n >= 5 ? 52 : n === 4 ? 60 : 72;
  const bodyFS = n >= 5 ? 28 : n === 4 ? 36 : 48;
  const hdrPad = n >= 5 ? '16px 12px' : n === 4 ? '18px 14px' : '22px 18px';

  const parts: string[] = [];
  steps.forEach((s, i) => {
    const hc = cardColor(s.color, defaultColors[i % defaultColors.length]);
    const num = s.number ?? (i + 1);
    const numLabel = `①②③④⑤⑥⑦⑧⑨⑩`[num - 1] ?? String(num);
    const icon = s.icon ? `<div style="font-size:${iconFS}px;line-height:1">${s.icon}</div>` : '';
    const bodyText = s.body
      ? `<div style="font-size:${bodyFS}px;color:#2a2a4a;line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(s.body)}</div>`
      : '';

    parts.push(`
    <div style="flex:1;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.12);display:flex;flex-direction:column">
      <div style="background:${hc};padding:${hdrPad};text-align:center;flex-shrink:0">
        <div style="color:#ffffff;font-size:${hdrFS}px;font-weight:700;font-family:'Noto Sans JP',sans-serif;line-height:1.3">${escHtml(numLabel + ' ' + s.label)}</div>
      </div>
      <div style="flex:1;padding:16px 18px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-around">
        ${icon}
        ${bodyText}
      </div>
    </div>`);

    if (i < steps.length - 1) {
      parts.push(`<div style="display:flex;align-items:center;flex-shrink:0;padding:0 6px;font-size:32px;color:${arrowColor};font-weight:900">▶</div>`);
    }
  });

  const body = `
  <div style="position:absolute;left:72px;right:72px;top:${top}px;bottom:${bottom}px;display:flex;gap:0;align-items:stretch">
    ${parts.join('')}
  </div>`;
  return ytSlideBase(def.title, body, footer || undefined, leadText || undefined);
}

/** VS比較バトル (左右カード + 中央VSバッジ) */
export function renderVsBattle(def: SlideDef): string {
  type Side = { header: string; headerColor?: string; lines?: string[]; highlight?: string; highlightColor?: string };
  const left  = (def.data.left  ?? {}) as Side;
  const right = (def.data.right ?? {}) as Side;
  const footer = String(def.data.footer ?? '');
  const leadText = String(def.data.leadText ?? '');
  const hasTitle = !!def.title;
  const top = hasTitle ? (leadText ? 270 : 175) : 80;
  const bottom = footer ? 96 : 40;

  const renderSide = (s: Side): string => {
    const hc = cardColor(s.headerColor, '#2b5ca8');
    const lines = (s.lines ?? []).map(l =>
      `<div style="font-size:50px;color:${C.text};line-height:1.55;font-family:'Noto Sans JP',sans-serif">${escHtml(l)}</div>`
    ).join('');
    const hl = s.highlight
      ? `<div style="font-size:76px;font-weight:700;color:${clampToPalette(s.highlightColor) ?? '#1976D2'};font-family:'Noto Sans JP',sans-serif">${escHtml(s.highlight)}</div>`
      : '';
    return `
    <div style="flex:1;background:#ffffff;border:1px solid ${C.border};border-radius:8px;overflow:hidden;display:flex;flex-direction:column">
      <div style="background:${hc};padding:28px 32px;text-align:center;flex-shrink:0">
        <div style="color:#ffffff;font-size:44px;font-weight:700;font-family:'Noto Sans JP',sans-serif;line-height:1.3">${escHtml(s.header)}</div>
      </div>
      <div style="flex:1;padding:32px 36px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:space-around">
        <div style="display:flex;flex-direction:column;gap:18px">${lines}</div>
        ${hl}
      </div>
    </div>`;
  };

  const body = `
  <div style="position:absolute;left:72px;right:72px;top:${top}px;bottom:${bottom}px;display:flex;gap:0;align-items:stretch">
    ${renderSide(left)}
    <div style="display:flex;align-items:center;justify-content:center;flex-shrink:0;width:100px">
      <span style="color:${C.muted};font-size:34px;font-weight:700;font-family:'Noto Sans JP',sans-serif;letter-spacing:1px">VS</span>
    </div>
    ${renderSide(right)}
  </div>`;
  return ytSlideBase(def.title, body, footer || undefined, leadText || undefined);
}

// ─── ★ 中央数値強調型 ─────────────────────────────────────────────────────────

/** ドーナツグラフ中央に主要指標を大きく配置（Slideland実例: ラクス/JAL統合報告書型） */
export function renderDonutCenter(def: SlideDef): string {
  type DonutItem = { label: string; value: number; color?: string };
  const items: DonutItem[] = Array.isArray(def.data.data) ? def.data.data as DonutItem[] : [];
  if (items.length === 0) return renderStat(def);

  const centerValue = String(def.data.centerValue ?? '');
  const centerLabel = String(def.data.centerLabel ?? '');
  const insight     = String(def.data.insight ?? '');
  const hasInsight  = insight.length > 0;
  const leadText    = String(def.data.leadText ?? '');

  const labels = items.map(d => d.label);
  const values = items.map(d => d.value);
  const colors = items.map((d, i) => clampToPalette(d.color) ?? C.chartPalette[i % C.chartPalette.length]);

  const chartCfg = JSON.stringify({
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderWidth: 5,
        borderColor: '#fff',
        hoverOffset: 12,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '64%',
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            font: { size: 28, family: 'Noto Sans JP', weight: '700' },
            color: '#1a1a1a',
            padding: 32,
            boxWidth: 28,
            boxHeight: 28,
            generateLabels: (chart: unknown) => {
              const meta = (chart as { data: { labels: string[]; datasets: { data: number[]; backgroundColor: string[] }[] } }).data;
              return meta.labels.map((label: string, i: number) => ({
                text: `${label}  ${meta.datasets[0].data[i]}%`,
                fillStyle: meta.datasets[0].backgroundColor[i],
                strokeStyle: '#fff',
                lineWidth: 2,
                index: i,
              }));
            },
          },
        },
        tooltip: {
          backgroundColor: '#171717',
          titleColor: '#fff',
          bodyColor: '#ccc',
          padding: 14,
          cornerRadius: 8,
        },
      },
    },
  });

  // ドーナツサイズ: 750px固定。insight有り→左エリア中央、無し→スライド中央
  const donutSize = 750;
  const donutLeft = hasInsight
    ? 72 + Math.round((SLIDE_W - 72 - 72 - 580 - 40 - donutSize) / 2)  // = 275px
    : Math.round((SLIDE_W - donutSize) / 2);                             // = 585px
  const cvFS = centerValue.length <= 3 ? 112 : centerValue.length <= 5 ? 88 : 68;

  const body = `
  <div style="position:absolute;left:72px;top:52px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
    ${leadText ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText)}</div>` : ''}
  </div>
  <!-- ドーナツ本体 -->
  <div style="position:absolute;left:${donutLeft}px;top:${leadText ? 290 : 170}px;width:${donutSize}px;height:${donutSize}px">
    <canvas id="chart"></canvas>
    <!-- ★ 中央テキスト（中央数値強調型の核心） -->
    <div style="position:absolute;top:42%;left:50%;transform:translate(-50%,-50%);text-align:center;pointer-events:none;z-index:1">
      <div style="font-size:${cvFS}px;font-weight:700;color:${C.heading};line-height:1;font-family:'Noto Sans JP',sans-serif">${escHtml(centerValue)}</div>
      ${centerLabel ? `<div style="font-size:28px;color:${C.muted};font-weight:700;margin-top:10px;letter-spacing:0.5px;font-family:'Noto Sans JP',sans-serif">${escHtml(centerLabel)}</div>` : ''}
    </div>
  </div>
  ${hasInsight ? `
  <!-- 右インサイトパネル -->
  <div style="position:absolute;right:72px;width:580px;top:200px;bottom:60px;display:flex;flex-direction:column;justify-content:center;gap:28px;padding:52px 44px;background:${C.lightFill};border:1px solid ${C.border};border-left:4px solid ${C.accent};border-radius:8px">
    <div style="font-size:11px;font-weight:700;color:${C.accent};letter-spacing:3px">KEY INSIGHT</div>
    <div style="width:36px;height:2px;background:${C.accent};border-radius:1px"></div>
    <div style="font-size:28px;color:${C.heading};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:700">${escHtml(insight)}</div>
  </div>` : ''}
  <script>
    window.addEventListener('load',()=>{
      const ctx=document.getElementById('chart').getContext('2d');
      new Chart(ctx,${chartCfg});
    });
  </script>`;
  return baseHtml(def.title, body);
}

// ─── ★ 差分強調型 ─────────────────────────────────────────────────────────────

/** 棒グラフ上にYoY/CAGR差分アノテーションを重ねる（Slideland実例: セプテーニHD/ZOZOタウン型） */
export function renderBarDiff(def: SlideDef): string {
  type BarItem = { label: string; value: number; color?: string };
  const items: BarItem[] = Array.isArray(def.data.data) ? def.data.data as BarItem[] : [];
  if (items.length === 0) return renderStat(def);

  const diff      = def.data.diff as { from?: string; to?: string; label: string; color?: string } | undefined;
  const cagrLabel = String(def.data.cagrLabel ?? '');
  const insight   = String(def.data.insight ?? '');
  const hasInsight = insight.length > 0;
  const leadText   = String(def.data.leadText ?? '');

  const labels = items.map(d => d.label);
  const values = items.map(d => d.value);
  const maxV   = Math.max(...values);
  const colors = items.map(d => clampToPalette(d.color) ?? (d.value === maxV ? C.accent : '#B0BEC5'));

  const chartCfg = JSON.stringify({
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#171717',
          titleColor: '#fff',
          bodyColor: '#ccc',
          padding: 14,
          cornerRadius: 8,
        },
      },
      scales: {
        x: {
          grid: { color: '#E0E0E0' },
          ticks: { color: C.muted, font: { size: 28, family: 'Noto Sans JP', weight: '700' } },
          border: { color: '#E0E0E0' },
        },
        y: {
          grid: { color: '#E0E0E0' },
          ticks: { color: C.muted, font: { size: 24, family: 'Noto Sans JP' } },
          border: { color: '#E0E0E0' },
          beginAtZero: true,
        },
      },
    },
  });

  const diffSafe = diff ? { ...diff, color: clampToPalette(diff.color) } : undefined;
  const diffScript = diff ? `
  const dDef = ${JSON.stringify(diffSafe)};
  const ci2  = Chart.getChart('chartDiff');
  if(ci2 && dDef.from && dDef.to){
    const fromIdx = ci2.data.labels.indexOf(dDef.from);
    const toIdx   = ci2.data.labels.indexOf(dDef.to);
    if(fromIdx>=0 && toIdx>=0){
      const meta = ci2.getDatasetMeta(0);
      const fp   = meta.data[fromIdx];
      const tp   = meta.data[toIdx];
      const wrap = document.getElementById('chartDiff').parentElement;
      const badge = document.createElement('div');
      const col   = dDef.color || '${C.accent}';
      badge.style.cssText='position:absolute;transform:translate(-50%,0);font-size:30px;font-weight:700;color:#fff;background:'+col+';border-radius:8px;padding:7px 22px;white-space:nowrap;font-family:Noto Sans JP,sans-serif';
      badge.style.left=((fp.x+tp.x)/2)+'px';
      badge.style.top=(Math.max(8,Math.min(fp.y,tp.y)-72))+'px';
      badge.textContent=dDef.label;
      wrap.appendChild(badge);
      [fp,tp].forEach(pt=>{
        const line=document.createElement('div');
        line.style.cssText='position:absolute;width:2px;background:'+col+';opacity:0.4;border-radius:1px';
        line.style.left=(pt.x-1)+'px';
        const top=Math.max(8,Math.min(fp.y,tp.y)-72)+44;
        line.style.top=top+'px';
        line.style.height=Math.max(0,pt.y-top-4)+'px';
        wrap.appendChild(line);
      });
    }
  }` : '';

  const chartRight = hasInsight ? SLIDE_W - 72 - 580 - 48 : SLIDE_W - 72;
  const barChartTop = leadText ? (cagrLabel ? 315 : 300) : (cagrLabel ? 195 : 180);
  const cagrBadgeTop = leadText ? 260 : 142;

  const body = `
  <div style="position:absolute;left:72px;top:52px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
    ${leadText ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText)}</div>` : ''}
  </div>
  ${cagrLabel ? `
  <div style="position:absolute;left:72px;right:${SLIDE_W - chartRight}px;top:${cagrBadgeTop}px;display:flex;justify-content:center;pointer-events:none">
    <div style="font-size:28px;font-weight:700;color:${C.accent};background:${C.lightFill};border:2px solid ${C.accent};border-radius:8px;padding:6px 24px;font-family:'Noto Sans JP',sans-serif;white-space:nowrap">${escHtml(cagrLabel)}</div>
  </div>` : ''}
  <div style="position:absolute;left:72px;right:${SLIDE_W - chartRight}px;top:${barChartTop}px;bottom:80px;position:relative" id="chartWrap">
    <div style="position:absolute;inset:0">
      <canvas id="chartDiff"></canvas>
    </div>
  </div>
  ${hasInsight ? `
  <div style="position:absolute;right:72px;width:540px;top:200px;bottom:60px;display:flex;flex-direction:column;justify-content:center;gap:24px;padding:48px 44px;background:${C.lightFill};border:1px solid ${C.border};border-left:4px solid ${C.accent};border-radius:8px">
    <div style="font-size:11px;font-weight:700;color:${C.accent};letter-spacing:3px">KEY INSIGHT</div>
    <div style="width:36px;height:2px;background:${C.accent};border-radius:1px"></div>
    <div style="font-size:28px;color:${C.heading};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:700">${escHtml(insight)}</div>
  </div>` : ''}
  <script>
    window.addEventListener('load',()=>{
      const wrap=document.getElementById('chartWrap');
      wrap.style.position='absolute';
      wrap.style.left='72px';
      wrap.style.right='${SLIDE_W - chartRight}px';
      wrap.style.top='${barChartTop}px';
      wrap.style.bottom='80px';
      const canvas=document.getElementById('chartDiff');
      const ctx=canvas.getContext('2d');
      new Chart(ctx,${chartCfg});
      ${diffScript}
    });
  </script>`;
  return baseHtml(def.title, body);
}
