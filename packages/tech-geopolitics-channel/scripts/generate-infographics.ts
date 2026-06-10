/**
 * generate-infographics.ts
 * script-input.json の infographics[] フィールドに基づいて Canvas PNG を生成する汎用スクリプト
 *
 * 使い方:
 *   npx ts-node scripts/generate-infographics.ts [--input ./input/script-input.json]
 *
 * 対応タイプ: donut_chart | bar_chart | stat_card | flow_diagram
 */

import { createCanvas, GlobalFonts, Canvas } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import * as fs from 'fs';
import * as path from 'path';
import type { InfographicSpec, InfographicFlowStep } from '@money-video/domain';

// ─── フォント登録 ────────────────────────────────────────────────────────────

GlobalFonts.registerFromPath('C:/Windows/Fonts/NotoSansJP-VF.ttf', 'NotoSansJP');
if (require('fs').existsSync('C:/Windows/Fonts/seguiemj.ttf')) {
  GlobalFonts.registerFromPath('C:/Windows/Fonts/seguiemj.ttf', 'SegoeEmoji');
}
const FONT = 'NotoSansJP';

// ─── キャンバス定数 ──────────────────────────────────────────────────────────

const W = 1200;
const H = 700;

const BG      = '#0d1b2a';
const BG_CARD = '#0f2236';
const DEFAULT_ACCENT = '#4a9eff';

// ─── ユーティリティ ──────────────────────────────────────────────────────────

function makeCanvas(): { canvas: Canvas; ctx: SKRSContext2D } {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  return { canvas, ctx };
}

function saveCanvas(canvas: Canvas, destPath: string): void {
  const buf = canvas.toBuffer('image/png');
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.writeFileSync(destPath, buf);
}

function drawGrid(ctx: SKRSContext2D): void {
  ctx.strokeStyle = 'rgba(74,158,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= W; x += 80) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y <= H; y += 80) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
}

function drawAccentBar(ctx: SKRSContext2D, accent: string): void {
  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, accent);
  grad.addColorStop(1, accent + '44');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 5);
}

function drawTitle(ctx: SKRSContext2D, title: string, accent: string): void {
  ctx.fillStyle = accent;
  ctx.font = `bold 22px ${FONT}`;
  ctx.fillText('▎', 42, 62);
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 34px ${FONT}`;
  ctx.fillText(title, 62, 62);
}

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ─── donut_chart ─────────────────────────────────────────────────────────────

function renderDonutChart(spec: InfographicSpec, destPath: string): void {
  const { canvas, ctx } = makeCanvas();
  const accent = spec.accentColor ?? DEFAULT_ACCENT;
  const data = spec.data ?? [];

  drawGrid(ctx);
  drawAccentBar(ctx, accent);
  drawTitle(ctx, spec.title, accent);

  const cx = W * 0.38;
  const cy = H * 0.55;
  const outerR = 200;
  const innerR = 110;

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  let startAngle = -Math.PI / 2;

  for (const item of data) {
    const slice = (item.value / total) * Math.PI * 2;
    const color = item.color ?? accent;

    ctx.beginPath();
    ctx.moveTo(cx + outerR * Math.cos(startAngle), cy + outerR * Math.sin(startAngle));
    ctx.arc(cx, cy, outerR, startAngle, startAngle + slice);
    ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = BG;
    ctx.lineWidth = 3;
    ctx.stroke();

    startAngle += slice;
  }

  // 中央テキスト（最大値アイテム）
  const maxItem = data.reduce((a, b) => (b.value > a.value ? b : a), data[0] ?? { label: '', value: 0 });
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold 60px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${maxItem.value}%`, cx, cy + 10);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#9ca3af';
  ctx.fillText(maxItem.label, cx, cy + 44);
  ctx.textAlign = 'left';

  // 凡例
  const legendX = W * 0.62;
  let legendY = H * 0.30;
  for (const item of data) {
    const color = item.color ?? accent;
    ctx.fillStyle = color;
    roundRect(ctx, legendX, legendY - 14, 18, 18, 4);
    ctx.fill();

    ctx.fillStyle = '#e5e7eb';
    ctx.font = `bold 26px ${FONT}`;
    ctx.fillText(`${item.value}%`, legendX + 30, legendY);

    ctx.fillStyle = '#9ca3af';
    ctx.font = `20px ${FONT}`;
    ctx.fillText(item.label, legendX + 30, legendY + 26);

    legendY += 80;
  }

  saveCanvas(canvas, destPath);
}

// ─── bar_chart ───────────────────────────────────────────────────────────────

function renderBarChart(spec: InfographicSpec, destPath: string): void {
  const { canvas, ctx } = makeCanvas();
  const accent = spec.accentColor ?? DEFAULT_ACCENT;
  const data = spec.data ?? [];

  drawGrid(ctx);
  drawAccentBar(ctx, accent);
  drawTitle(ctx, spec.title, accent);

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const barAreaX = 340;
  const barAreaW = W - barAreaX - 80;
  const startY = 120;
  const barHeight = Math.min(60, (H - startY - 80) / Math.max(data.length, 1) - 20);
  const gap = barHeight + 20;

  for (let i = 0; i < data.length; i++) {
    const item = data[i]!;
    const y = startY + i * gap;
    const barW = (item.value / maxValue) * barAreaW;
    const color = item.color ?? accent;

    ctx.fillStyle = '#d1d5db';
    ctx.font = `22px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(item.label, barAreaX - 14, y + barHeight * 0.7);
    ctx.textAlign = 'left';

    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    roundRect(ctx, barAreaX, y, barAreaW, barHeight, 6);
    ctx.fill();

    const barGrad = ctx.createLinearGradient(barAreaX, 0, barAreaX + barW, 0);
    barGrad.addColorStop(0, color);
    barGrad.addColorStop(1, color + 'bb');
    ctx.fillStyle = barGrad;
    roundRect(ctx, barAreaX, y, barW, barHeight, 6);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText(`${item.value}`, barAreaX + barW + 10, y + barHeight * 0.7);
  }

  if (spec.subtext) {
    ctx.fillStyle = '#6b7280';
    ctx.font = `18px ${FONT}`;
    ctx.fillText(spec.subtext, 42, H - 28);
  }

  saveCanvas(canvas, destPath);
}

// ─── stat_card ───────────────────────────────────────────────────────────────

function renderStatCard(spec: InfographicSpec, destPath: string): void {
  const { canvas, ctx } = makeCanvas();
  const accent = spec.accentColor ?? DEFAULT_ACCENT;

  drawGrid(ctx);
  drawAccentBar(ctx, accent);

  ctx.fillStyle = BG_CARD;
  roundRect(ctx, 60, 60, W - 120, H - 120, 20);
  ctx.fill();
  ctx.strokeStyle = accent + '44';
  ctx.lineWidth = 1;
  roundRect(ctx, 60, 60, W - 120, H - 120, 20);
  ctx.stroke();

  ctx.fillStyle = '#9ca3af';
  ctx.font = `26px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(spec.title, W / 2, 148);

  const value = spec.value ?? '—';
  ctx.font = `bold 160px ${FONT}`;
  ctx.fillStyle = accent;
  ctx.fillText(value, W / 2, H / 2 + 40);

  if (spec.label) {
    ctx.font = `bold 34px ${FONT}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(spec.label, W / 2, H / 2 + 96);
  }

  if (spec.subtext) {
    ctx.font = `20px ${FONT}`;
    ctx.fillStyle = '#6b7280';
    ctx.fillText(spec.subtext, W / 2, H - 90);
  }

  ctx.textAlign = 'left';
  saveCanvas(canvas, destPath);
}

// ─── flow_diagram ────────────────────────────────────────────────────────────

function renderFlowDiagram(spec: InfographicSpec, destPath: string): void {
  const { canvas, ctx } = makeCanvas();
  const accent = spec.accentColor ?? DEFAULT_ACCENT;
  const steps = (spec.steps ?? []).slice(0, 5) as InfographicFlowStep[];

  drawGrid(ctx);
  drawAccentBar(ctx, accent);
  drawTitle(ctx, spec.title, accent);

  const n = steps.length;
  if (n === 0) { saveCanvas(canvas, destPath); return; }

  const boxW = Math.min(160, (W - 120) / n - 40);
  const boxH = 120;
  const totalW = n * boxW + (n - 1) * 60;
  const startX = (W - totalW) / 2;
  const boxY = (H - boxH) / 2 + 20;
  const arrowLen = 60;

  for (let i = 0; i < n; i++) {
    const step = steps[i]!;
    const x = startX + i * (boxW + arrowLen);

    const grad = ctx.createLinearGradient(x, boxY, x, boxY + boxH);
    grad.addColorStop(0, accent + '33');
    grad.addColorStop(1, accent + '11');
    ctx.fillStyle = grad;
    roundRect(ctx, x, boxY, boxW, boxH, 12);
    ctx.fill();
    ctx.strokeStyle = accent + '88';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x, boxY, boxW, boxH, 12);
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(`STEP ${i + 1}`, x + boxW / 2, boxY + 28);

    if (step.icon) {
      ctx.font = `28px SegoeEmoji, ${FONT}`;
      ctx.fillText(step.icon, x + boxW / 2, boxY + 62);
      ctx.font = `18px ${FONT}`;
      ctx.fillStyle = '#e5e7eb';
      const words = step.label.length > 8 ? [step.label.slice(0, 8), step.label.slice(8)] : [step.label];
      words.forEach((w, wi) => ctx.fillText(w, x + boxW / 2, boxY + 90 + wi * 22));
    } else {
      ctx.font = `bold 19px ${FONT}`;
      ctx.fillStyle = '#e5e7eb';
      const words = step.label.length > 8 ? [step.label.slice(0, 8), step.label.slice(8)] : [step.label];
      words.forEach((w, wi) => ctx.fillText(w, x + boxW / 2, boxY + 62 + wi * 26));
    }

    if (i < n - 1) {
      const ax = x + boxW + 8;
      const ay = boxY + boxH / 2;
      ctx.fillStyle = accent + 'aa';
      ctx.font = `28px ${FONT}`;
      ctx.fillText('→', ax + 10, ay + 10);
    }
  }

  ctx.textAlign = 'left';
  saveCanvas(canvas, destPath);
}

// ─── ディスパッチ ─────────────────────────────────────────────────────────────

function generateOne(spec: InfographicSpec, publicDir: string): void {
  const destPath = path.resolve(publicDir, spec.outputPath);

  if (fs.existsSync(destPath)) {
    console.log(`  [SKIP] already exists: ${spec.outputPath}`);
    return;
  }

  switch (spec.type) {
    case 'donut_chart':  renderDonutChart(spec, destPath); break;
    case 'bar_chart':    renderBarChart(spec, destPath); break;
    case 'stat_card':    renderStatCard(spec, destPath); break;
    case 'flow_diagram': renderFlowDiagram(spec, destPath); break;
    default: {
      const t = (spec as InfographicSpec).type;
      console.log(`  [SKIP] unknown type: ${t}`);
      return;
    }
  }

  const size = Math.round(fs.statSync(destPath).size / 1024);
  console.log(`  [OK] ${spec.outputPath} (${size}KB)`);
}

// ─── エントリポイント ─────────────────────────────────────────────────────────

function main(): void {
  const args = process.argv.slice(2);
  let inputPath = './input/script-input.json';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputPath = args[i + 1]!;
      i++;
    }
  }

  const absInput = path.resolve(inputPath);
  if (!fs.existsSync(absInput)) {
    console.error(`Error: input not found: ${absInput}`);
    process.exit(1);
  }

  const scriptInput = JSON.parse(fs.readFileSync(absInput, 'utf-8')) as { infographics?: InfographicSpec[] };
  const specs = scriptInput.infographics ?? [];

  if (specs.length === 0) {
    console.log('infographics フィールドがないか空です — スキップ');
    return;
  }

  const publicDir = path.resolve('./public');
  console.log(`\n${specs.length} 件のインフォグラフィックを生成します...\n`);

  let okCount = 0;
  let skipCount = 0;

  for (const spec of specs) {
    const destPath = path.resolve(publicDir, spec.outputPath);
    const existed = fs.existsSync(destPath);
    generateOne(spec, publicDir);
    if (existed) skipCount++; else okCount++;
  }

  console.log(`\n完了: ${okCount} 生成, ${skipCount} スキップ\n`);
}

main();
