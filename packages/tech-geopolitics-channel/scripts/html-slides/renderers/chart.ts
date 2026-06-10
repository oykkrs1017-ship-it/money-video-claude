/** html-slides/renderers/chart.ts — chart / chart-insight */

import { C, SLIDE_W } from '../context';
import { escHtml, baseHtml } from '../utils';
import type { SlideDef } from '../types';
import { renderStat } from './basic';

/** Chart.js グラフ */
export function renderChart(def: SlideDef): string {
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
          ? values.map(v => v === max ? C.accent : '#B0BEC5')
          : 'rgba(25,118,210,0.08)',
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
          grid: { color: '#E0E0E0' },
          ticks: { color: C.muted, font: { size: 26, family: 'Noto Sans JP' } },
          border: { color: '#E0E0E0' },
        },
        y: {
          beginAtZero: true,
          grid: { color: '#E0E0E0' },
          ticks: { color: C.muted, font: { size: 26, family: 'Noto Sans JP' } },
          border: { color: '#E0E0E0' },
        },
      },
    },
  });

  const insightText = String(def.data.insight ?? '');
  const leadText    = String(def.data.leadText ?? '');
  const canvasTop   = leadText ? 295 : 200;
  const canvasBottom = insightText ? 180 : 60;
  const annotations = Array.isArray(def.data.annotations) ? def.data.annotations as Array<{x:string;text:string;position?:string;color?:string}> : [];

  const annotationScript = annotations.length > 0 ? `
    const annots = ${JSON.stringify(annotations)};
    const chartInst = Chart.getChart('chart');
    if(chartInst){
      const meta = chartInst.getDatasetMeta(0);
      const canvas = document.getElementById('chart');
      const overlay = document.createElement('div');
      overlay.style.cssText='position:absolute;inset:0;pointer-events:none';
      canvas.parentElement.style.position='relative';
      canvas.parentElement.appendChild(overlay);
      annots.forEach(a=>{
        const idx = chartInst.data.labels.indexOf(a.x);
        if(idx<0)return;
        const pt = meta.data[idx];
        if(!pt)return;
        const x = pt.x; const y = pt.y;
        const isBot = a.position==='bottom';
        const col = a.color||'${C.accent}';
        const div = document.createElement('div');
        div.style.cssText='position:absolute;transform:translate(-50%,0);white-space:nowrap;font-size:18px;font-weight:700;color:'+col+';background:rgba(255,255,255,0.92);border:1.5px solid '+col+';border-radius:6px;padding:4px 12px;pointer-events:none;font-family:'Noto Sans JP',sans-serif';
        div.style.left=x+'px';
        div.style.top=(isBot?y+12:y-44)+'px';
        div.textContent=a.text;
        overlay.appendChild(div);
      });
    }` : '';

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(cd.title ?? def.title)}</div>
    <div class="accent-line"></div>
    ${leadText ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText)}</div>` : ''}
  </div>
  <div style="position:absolute;left:72px;right:72px;top:${canvasTop}px;bottom:${canvasBottom}px">
    <canvas id="chart"></canvas>
  </div>
  ${insightText ? `
  <div style="position:absolute;left:72px;right:72px;bottom:48px;height:112px;background:${C.lightFill};border:1px solid ${C.border};border-left:4px solid ${C.accent};border-radius:8px;padding:0 36px;display:flex;align-items:center;gap:28px">
    <div style="font-size:11px;font-weight:800;color:${C.accent};letter-spacing:3px;white-space:nowrap">KEY<br>INSIGHT</div>
    <div style="width:1px;align-self:stretch;background:${C.border};flex-shrink:0;margin:20px 0"></div>
    <div style="font-size:26px;color:${C.heading};line-height:1.55;font-family:'Noto Sans JP',sans-serif;font-weight:700;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${escHtml(insightText)}</div>
  </div>` : ''}
  <script>
    window.addEventListener('load',()=>{
      const ctx=document.getElementById('chart').getContext('2d');
      new Chart(ctx,${chartCfg});
      ${annotationScript}
    });
  </script>`;
  return baseHtml(def.title, body);
}

/** チャート＋右インサイトパネル (2カラム) */
export function renderChartInsight(def: SlideDef): string {
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
          ? values.map(v => v === max ? C.accent : '#B0BEC5')
          : 'rgba(25,118,210,0.08)',
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
          ticks: { color: C.muted, font: { size: 16, family: 'Noto Sans JP' } },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.06)' },
          ticks: { color: C.muted, font: { size: 16, family: 'Noto Sans JP' } },
          border: { color: 'rgba(0,0,0,0.08)' },
        },
      },
    },
  });

  const panelW = 580;
  const gapX   = 40;
  const chartRight = SLIDE_W - 72 - panelW - gapX;

  const leadText2 = String(def.data.leadText ?? '');
  const contentTop = leadText2 ? 295 : 200;

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(cd.title ?? def.title)}</div>
    <div class="accent-line"></div>
    ${leadText2 ? `<div style="font-size:32px;color:${C.muted};line-height:1.65;font-family:'Noto Sans JP',sans-serif;font-weight:500;margin-top:14px">${escHtml(leadText2)}</div>` : ''}
  </div>
  <!-- 左: チャート -->
  <div style="position:absolute;left:72px;right:${SLIDE_W - chartRight}px;top:${contentTop}px;bottom:60px">
    <canvas id="chart"></canvas>
  </div>
  <!-- 右: インサイトパネル -->
  <div style="position:absolute;right:72px;width:${panelW}px;top:${contentTop}px;bottom:60px;display:flex;flex-direction:column;justify-content:center;gap:24px;padding:48px 44px;background:rgba(10,114,239,0.04);border:1px solid rgba(10,114,239,0.14);border-left:4px solid ${C.accent};border-radius:12px">
    <div style="font-size:11px;font-weight:800;color:${C.accent};letter-spacing:3px;margin-bottom:4px">KEY INSIGHT</div>
    <div style="width:40px;height:2px;background:${C.accent};border-radius:1px"></div>
    <div style="font-size:26px;color:${C.heading};line-height:1.7;font-family:'Noto Sans JP',sans-serif;font-weight:700">${escHtml(insight)}</div>
  </div>
  <script>
    window.addEventListener('load',()=>{
      const ctx=document.getElementById('chart').getContext('2d');
      new Chart(ctx,${chartCfg});
    });
  </script>`;
  return baseHtml(def.title, body);
}
