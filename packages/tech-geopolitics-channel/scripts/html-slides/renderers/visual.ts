/** html-slides/renderers/visual.ts — pyramid / venn / map (SVGベースの地理・図解) */

import { C } from '../context';
import { escHtml, baseHtml } from '../utils';
import type { SlideDef } from '../types';

// ─── ベースマップ陸地データ (viewBox 1000×600) ──────────────────────────────

const LANDMASS: Record<'asia' | 'world' | 'japan', string[]> = {
  world: [
    'M120,120 C90,90 180,70 230,110 C270,140 250,200 210,215 C200,255 150,260 130,220 C100,200 110,160 120,120 Z',
    'M210,300 C255,288 290,345 272,425 C262,475 222,505 202,462 C190,400 198,332 210,300 Z',
    'M515,135 C560,115 600,140 590,182 C622,205 642,285 600,365 C580,445 540,472 520,420 C502,362 512,300 500,242 C496,200 498,160 515,135 Z',
    'M615,120 C700,88 825,108 885,160 C905,200 862,242 800,232 C760,262 700,250 660,210 C630,190 608,160 615,120 Z',
    'M820,425 C862,405 902,425 890,463 C880,492 840,502 820,472 C810,452 810,438 820,425 Z',
  ],
  asia: [
    'M70,90 C300,45 600,62 770,125 C812,168 788,228 726,248 C684,308 600,326 560,284 C520,306 460,304 442,262 C382,284 300,262 282,304 C242,346 182,334 162,292 C120,262 92,182 70,90 Z',
    'M398,300 C430,300 442,362 420,424 C410,456 384,456 379,414 C374,362 380,320 398,300 Z',
    'M560,440 C600,432 624,452 612,476 C600,496 566,496 556,470 C552,454 552,448 560,440 Z',
    'M650,460 C684,452 706,470 695,492 C684,510 652,510 644,486 C640,472 642,466 650,460 Z',
    'M858,175 C880,158 902,200 882,242 C904,262 882,304 860,282 C850,250 848,210 858,175 Z',
  ],
  japan: [
    'M620,115 C662,96 704,128 682,170 C662,192 620,182 610,150 C604,134 610,124 620,115 Z',
    'M430,255 C520,215 590,228 600,196 C566,300 486,362 422,424 C400,456 360,444 382,402 C404,338 410,288 430,255 Z',
    'M360,470 C392,462 414,482 402,506 C390,524 358,524 350,500 C346,486 348,478 360,470 Z',
    'M300,440 C326,434 344,452 334,472 C324,488 298,488 292,466 C289,454 290,448 300,440 Z',
  ],
};

// ─── レンダラー ───────────────────────────────────────────────────────────────

/** ピラミッド / じょうろ図 — direction:'up'=ピラミッド / 'down'=じょうろ */
export function renderPyramid(def: SlideDef): string {
  const direction = (def.data.direction === 'down' ? 'down' : 'up');
  const layers = (Array.isArray(def.data.layers) ? def.data.layers : []) as Array<{ label: string; sublabel?: string; value?: string }>;
  const n = Math.max(layers.length, 1);
  const footer = String(def.data.footer ?? '');
  const COLORS = ['#0a72ef', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

  const VW = 1200, VH = 760, cx = VW / 2, gap = 10;
  const bandH = (VH - gap * (n - 1)) / n;
  const minW = 220, maxW = 1140;
  const wAt = (i: number): number => {
    const t = i / n;
    return direction === 'up' ? minW + (maxW - minW) * t : maxW - (maxW - minW) * t;
  };

  const bands = layers.map((ly, i) => {
    const color = COLORS[i % COLORS.length];
    const yTop = i * (bandH + gap), yBot = yTop + bandH, cyMid = yTop + bandH / 2;
    const wTop = wAt(i), wBot = wAt(i + 1);
    const pts = [[cx - wTop / 2, yTop], [cx + wTop / 2, yTop], [cx + wBot / 2, yBot], [cx - wBot / 2, yBot]].map(p => p.join(',')).join(' ');
    const label = escHtml(ly.label) + (ly.value ? `　${escHtml(ly.value)}` : '');
    const subHtml = ly.sublabel
      ? `<text x="${cx}" y="${cyMid + 30}" text-anchor="middle" font-size="20" fill="rgba(255,255,255,0.92)" style="paint-order:stroke;stroke:rgba(0,0,0,0.25);stroke-width:5px;font-family:'Noto Sans JP',sans-serif">${escHtml(ly.sublabel)}</text>`
      : '';
    return `
      <polygon points="${pts}" fill="${color}" fill-opacity="0.92" stroke="#fff" stroke-width="3"/>
      <text x="${cx}" y="${ly.sublabel ? cyMid - 4 : cyMid + 10}" text-anchor="middle" font-size="32" font-weight="800" fill="#fff" style="paint-order:stroke;stroke:rgba(0,0,0,0.28);stroke-width:5px;font-family:'Noto Sans JP',sans-serif">${label}</text>
      ${subHtml}`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:${footer ? 96 : 48}px;display:flex;align-items:center;justify-content:center">
    <svg viewBox="0 0 ${VW} ${VH}" style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet">${bands}</svg>
  </div>
  ${footer ? `<div style="position:absolute;left:72px;right:72px;bottom:40px;font-size:22px;color:${C.muted};font-family:'Noto Sans JP',sans-serif;text-align:center">${escHtml(footer)}</div>` : ''}`;
  return baseHtml(def.title, body);
}

/** ベン図 — 2〜3セットの重なり (透明度で重複表現) */
export function renderVenn(def: SlideDef): string {
  const sets = (Array.isArray(def.data.sets) ? def.data.sets : []) as Array<{ label: string; items?: string[]; color?: string }>;
  const overlapLabel = String(def.data.overlapLabel ?? '');
  const footer = String(def.data.footer ?? '');
  const n = Math.min(sets.length, 3);
  const DEFAULT = ['#0a72ef', '#dc2626', '#059669'];

  const VW = 1200, VH = 760;
  type Circ = { cx: number; cy: number; r: number; color: string; set: { label: string; items?: string[] } };
  let circles: Circ[];
  if (n <= 2) {
    const r = 250, cy = 380;
    circles = [{ cx: 470, cy, r, color: sets[0]?.color ?? DEFAULT[0], set: sets[0] ?? { label: '' } }];
    if (n === 2) circles.push({ cx: 730, cy, r, color: sets[1]?.color ?? DEFAULT[1], set: sets[1] });
  } else {
    const r = 230;
    circles = [
      { cx: 600, cy: 280, r, color: sets[0]?.color ?? DEFAULT[0], set: sets[0] },
      { cx: 460, cy: 500, r, color: sets[1]?.color ?? DEFAULT[1], set: sets[1] },
      { cx: 740, cy: 500, r, color: sets[2]?.color ?? DEFAULT[2], set: sets[2] },
    ];
  }

  const circleSvg = circles.map(c => `<circle cx="${c.cx}" cy="${c.cy}" r="${c.r}" fill="${c.color}" fill-opacity="0.25" stroke="${c.color}" stroke-width="3"/>`).join('');
  const labelSvg = circles.map((c, i) => {
    const offX = n <= 2 ? (i === 0 ? -120 : 120) : (i === 0 ? 0 : i === 1 ? -100 : 100);
    const offY = n <= 2 ? -40 : (i === 0 ? -70 : 50);
    const tx = c.cx + offX, ty = c.cy + offY;
    const items = (c.set?.items ?? []).slice(0, 4).map((it, k) =>
      `<text x="${tx}" y="${ty + 40 + k * 34}" text-anchor="middle" font-size="22" fill="${C.text}" style="paint-order:stroke;stroke:#fff;stroke-width:5px;font-family:'Noto Sans JP',sans-serif">${escHtml(it)}</text>`).join('');
    return `<text x="${tx}" y="${ty}" text-anchor="middle" font-size="30" font-weight="800" fill="${c.color}" style="paint-order:stroke;stroke:#fff;stroke-width:6px;font-family:'Noto Sans JP',sans-serif">${escHtml(c.set?.label ?? '')}</text>${items}`;
  }).join('');
  const oCx = circles.reduce((s, c) => s + c.cx, 0) / circles.length;
  const oCy = circles.reduce((s, c) => s + c.cy, 0) / circles.length;
  const overlapSvg = overlapLabel && n >= 2
    ? `<text x="${oCx}" y="${oCy}" text-anchor="middle" font-size="26" font-weight="800" fill="${C.heading}" style="paint-order:stroke;stroke:#fff;stroke-width:7px;font-family:'Noto Sans JP',sans-serif">${escHtml(overlapLabel)}</text>`
    : '';

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:${footer ? 96 : 48}px;display:flex;align-items:center;justify-content:center">
    <svg viewBox="0 0 ${VW} ${VH}" style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet">${circleSvg}${labelSvg}${overlapSvg}</svg>
  </div>
  ${footer ? `<div style="position:absolute;left:72px;right:72px;bottom:40px;font-size:22px;color:${C.muted};font-family:'Noto Sans JP',sans-serif;text-align:center">${escHtml(footer)}</div>` : ''}`;
  return baseHtml(def.title, body);
}

/** 地図 / 拠点 — 物流要衝・地政学リスクの可視化 */
export function renderMap(def: SlideDef): string {
  const region = (['asia', 'world', 'japan'].includes(String(def.data.region)) ? def.data.region : 'world') as 'asia' | 'world' | 'japan';
  const points = (Array.isArray(def.data.points) ? def.data.points : []) as Array<{ label: string; x: number; y: number; highlight?: boolean; note?: string }>;
  const routes = (Array.isArray(def.data.routes) ? def.data.routes : []) as Array<{ from: number; to: number; label?: string }>;
  const footer = String(def.data.footer ?? '');

  const MW = 1000, MH = 600;
  const px = (x: number) => (x / 100) * MW, py = (y: number) => (y / 100) * MH;

  const grid = [
    ...Array.from({ length: 9 }, (_, i) => `<line x1="${(i + 1) * 100}" y1="0" x2="${(i + 1) * 100}" y2="${MH}" stroke="rgba(10,114,239,0.07)" stroke-width="1"/>`),
    ...Array.from({ length: 5 }, (_, i) => `<line x1="0" y1="${(i + 1) * 100}" x2="${MW}" y2="${(i + 1) * 100}" stroke="rgba(10,114,239,0.07)" stroke-width="1"/>`),
  ].join('');
  const land = LANDMASS[region].map(d => `<path d="${d}" fill="#cdd9e5" fill-opacity="0.85" stroke="#aab8c8" stroke-width="1.5"/>`).join('');

  const routeSvg = routes.map(rt => {
    const a = points[rt.from], b = points[rt.to];
    if (!a || !b) return '';
    const x1 = px(a.x), y1 = py(a.y), x2 = px(b.x), y2 = py(b.y);
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2, dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const cxp = mx - dy / len * 60, cyp = my + dx / len * 60;
    const lbl = rt.label ? `<text x="${cxp}" y="${cyp - 8}" text-anchor="middle" font-size="18" font-weight="700" fill="${C.accent}" style="paint-order:stroke;stroke:#fff;stroke-width:5px;font-family:'Noto Sans JP',sans-serif">${escHtml(rt.label)}</text>` : '';
    return `<path d="M${x1},${y1} Q${cxp},${cyp} ${x2},${y2}" fill="none" stroke="${C.accent}" stroke-width="3" stroke-dasharray="8 6" marker-end="url(#arrow)"/>${lbl}`;
  }).join('');

  const pointSvg = points.map(p => {
    const cxp = px(p.x), cyp = py(p.y), col = p.highlight ? '#dc2626' : C.accent;
    const ring = p.highlight ? `<circle cx="${cxp}" cy="${cyp}" r="20" fill="none" stroke="${col}" stroke-width="3" opacity="0.5"/>` : '';
    const note = p.note ? `<text x="${cxp}" y="${cyp + 44}" text-anchor="middle" font-size="18" fill="${C.muted}" style="paint-order:stroke;stroke:#fff;stroke-width:5px;font-family:'Noto Sans JP',sans-serif">${escHtml(p.note)}</text>` : '';
    return `${ring}<circle cx="${cxp}" cy="${cyp}" r="11" fill="${col}" stroke="#fff" stroke-width="3"/><text x="${cxp}" y="${cyp - 22}" text-anchor="middle" font-size="24" font-weight="800" fill="${C.heading}" style="paint-order:stroke;stroke:#fff;stroke-width:6px;font-family:'Noto Sans JP',sans-serif">${escHtml(p.label)}</text>${note}`;
  }).join('');

  const body = `
  <div style="position:absolute;left:72px;top:60px;right:72px">
    <div class="slide-h1">${escHtml(def.title)}</div>
    <div class="accent-line"></div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:200px;bottom:${footer ? 96 : 48}px;border-radius:12px;overflow:hidden;background:#eef4fb;box-shadow:0 0 0 1px ${C.border}">
    <svg viewBox="0 0 ${MW} ${MH}" style="width:100%;height:100%" preserveAspectRatio="xMidYMid meet">
      <defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${C.accent}"/></marker></defs>
      ${grid}${land}${routeSvg}${pointSvg}
    </svg>
  </div>
  ${footer ? `<div style="position:absolute;left:72px;right:72px;bottom:40px;font-size:22px;color:${C.muted};font-family:'Noto Sans JP',sans-serif;text-align:center">${escHtml(footer)}</div>` : ''}`;
  return baseHtml(def.title, body);
}
