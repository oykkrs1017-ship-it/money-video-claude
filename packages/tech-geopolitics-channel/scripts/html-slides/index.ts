/** html-slides/index.ts — buildIndex / exportPngs / main エントリ */

import * as fs from 'fs';
import * as path from 'path';
import puppeteer from 'puppeteer';

import { SLIDE_W, SLIDE_H } from './context';
import { applyTheme, resolveTheme } from './theme';
import { escHtml } from './utils';
import type { ScriptInput, Visual, ChartVisual, StatVisual, SlideDef } from './types';
import { renderSlide, visualToSlide, buildCombinedSlide } from './dispatch';

// ─── スライドマップエントリ型 ─────────────────────────────────────────────────

interface SlideMapEntry {
  slideNum: number;
  slidePng: string;      // Remotion staticFile パス: 'html-slides/png/slide-001.png'
  type: 'cover' | 'toc' | 'section' | 'visual';
  audioFile?: string;
  audioFiles?: string[];
}

// ─── インデックス HTML ────────────────────────────────────────────────────────

export function buildIndex(slideFiles: string[], videoTitle: string): string {
  const thumbW = 380;
  const thumbH = Math.round(thumbW * SLIDE_H / SLIDE_W);
  const ratio  = thumbH / SLIDE_H;

  const thumbs = slideFiles.map((f, i) => `
    <div onclick="openSlide(${i})" style="cursor:pointer;width:${thumbW}px;height:${thumbH}px;border-radius:8px;overflow:hidden;box-shadow:0 0 0 1px rgba(0,0,0,0.12);transition:box-shadow .2s;position:relative" onmouseover="this.style.boxShadow='0 0 0 2px #0a72ef'" onmouseout="this.style.boxShadow='0 0 0 1px rgba(0,0,0,0.12)'">
      <iframe src="${path.basename(f)}" scrolling="no" style="width:${SLIDE_W}px;height:${SLIDE_H}px;transform:scale(${ratio});transform-origin:top left;pointer-events:none;border:none"></iframe>
      <div style="position:absolute;bottom:6px;right:8px;background:rgba(0,0,0,0.65);color:#fff;font-size:12px;font-weight:700;padding:2px 8px;border-radius:4px">${String(i + 1).padStart(2, '0')}</div>
    </div>`).join('');

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${escHtml(videoTitle)} — スライド一覧</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+JP:wght@400;700&display=swap" rel="stylesheet">
<style>
  body{margin:0;padding:0;background:#f5f5f5;font-family:'Noto Sans JP',sans-serif;min-height:100vh}
  .hdr{padding:32px 40px 20px;background:#fff;border-bottom:1px solid rgba(0,0,0,0.08)}
  .grid{padding:32px 40px;display:flex;flex-wrap:wrap;gap:20px}
  #lb{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:100;align-items:center;justify-content:center;flex-direction:column;gap:20px}
  #lb-frame{border:none;border-radius:8px;box-shadow:0 24px 48px rgba(0,0,0,0.5)}
</style>
</head>
<body>
<div class="hdr">
  <div style="color:#0a72ef;font-size:13px;font-weight:700;letter-spacing:1px;margin-bottom:6px">SLIDE DECK</div>
  <div style="color:#171717;font-size:28px;font-weight:700;letter-spacing:-0.5px">${escHtml(videoTitle)}</div>
  <div style="color:#666;font-size:14px;margin-top:4px">${slideFiles.length} スライド</div>
</div>
<div class="grid">${thumbs}</div>

<div id="lb">
  <iframe id="lb-frame" style="width:${Math.round(SLIDE_W * 0.65)}px;height:${Math.round(SLIDE_H * 0.65)}px"></iframe>
  <div style="display:flex;gap:16px;align-items:center">
    <button onclick="nav(-1)" style="background:#0a72ef;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:18px;cursor:pointer;font-weight:700">‹ 前</button>
    <span id="lb-num" style="color:#fff;font-size:16px;min-width:80px;text-align:center"></span>
    <button onclick="nav(1)"  style="background:#0a72ef;color:#fff;border:none;padding:10px 28px;border-radius:8px;font-size:18px;cursor:pointer;font-weight:700">次 ›</button>
  </div>
  <button onclick="closeLB()" style="position:fixed;top:20px;right:28px;background:transparent;color:#aaa;border:none;font-size:36px;cursor:pointer;line-height:1">✕</button>
</div>

<script>
const slides=${JSON.stringify(slideFiles.map(f => path.basename(f)))};
let cur=0;
function openSlide(i){cur=i;document.getElementById('lb').style.display='flex';update();}
function closeLB(){document.getElementById('lb').style.display='none';}
function nav(d){cur=(cur+d+slides.length)%slides.length;update();}
function update(){document.getElementById('lb-frame').src=slides[cur];document.getElementById('lb-num').textContent=(cur+1)+' / '+slides.length;}
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeLB();if(e.key==='ArrowRight')nav(1);if(e.key==='ArrowLeft')nav(-1);});
</script>
</body>
</html>`;
}

// ─── PNG エクスポート ─────────────────────────────────────────────────────────

export async function exportPngs(htmlFiles: string[], pngDir: string): Promise<void> {
  console.log(`[html-slides] PNG エクスポート (${htmlFiles.length} 枚)...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
  });
  for (let i = 0; i < htmlFiles.length; i++) {
    const page = await browser.newPage();
    await page.setViewport({ width: SLIDE_W, height: SLIDE_H, deviceScaleFactor: 1 });
    await page.goto(`file://${htmlFiles[i]}`, { waitUntil: 'networkidle0', timeout: 20000 });
    await new Promise(r => setTimeout(r, 600));
    const pngPath = path.join(pngDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
    await page.screenshot({ path: pngPath as `${string}.png`, type: 'png' });
    await page.close();
    process.stdout.write(`\r  ${i + 1}/${htmlFiles.length} 完了`);
  }
  await browser.close();
  console.log('\n[html-slides] 完了');
}

// ─── メイン ───────────────────────────────────────────────────────────────────

export async function main() {
  const args     = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const noPng    = args.includes('--no-png');
  const themeIdx = args.indexOf('--theme');
  const themeArg = themeIdx >= 0 ? args[themeIdx + 1] : undefined;

  const inputPath = inputIdx >= 0
    ? path.resolve(args[inputIdx + 1])
    : path.resolve(__dirname, '../input/script-input.json');

  if (!fs.existsSync(inputPath)) { console.error('入力ファイルが見つかりません:', inputPath); process.exit(1); }

  const script: ScriptInput = JSON.parse(fs.readFileSync(inputPath, 'utf-8'));
  const chartData = script.chartData ?? {};

  const theme = resolveTheme(themeArg, script.title ?? inputPath);
  applyTheme(theme);

  console.log(`[html-slides] タイトル: ${script.title}`);
  console.log(`[html-slides] テーマ: ${theme.name}（accent: ${theme.accent}）`);

  const outDir       = path.resolve(__dirname, '../out/html-slides');
  const pngDir       = path.join(outDir, 'png');
  const publicPngDir = path.resolve(__dirname, '../public/html-slides/png');
  fs.mkdirSync(pngDir, { recursive: true });
  fs.mkdirSync(publicPngDir, { recursive: true });

  // 前回の slide-*.png を削除（累積防止）
  const slidePattern = /^slide-\d+\.png$/;
  if (fs.existsSync(pngDir)) {
    fs.readdirSync(pngDir).filter(f => slidePattern.test(f)).forEach(f => fs.unlinkSync(path.join(pngDir, f)));
  }
  if (fs.existsSync(publicPngDir)) {
    fs.readdirSync(publicPngDir).filter(f => slidePattern.test(f)).forEach(f => fs.unlinkSync(path.join(publicPngDir, f)));
  }

  const slideDefs: SlideDef[] = [];
  const slideMap: SlideMapEntry[] = [];

  // カバー
  slideDefs.push({ title: script.title, section: '', layout: 'cover', data: { subtitle: script.description ?? '' } });
  slideMap.push({ slideNum: 1, slidePng: 'html-slides/png/slide-001.png', type: 'cover' });

  // 目次スライド
  const tocChapters: Array<{ num: number; topic: string }> = [];
  let tocNum = 0;
  for (const ch of script.chapters) {
    if (ch.type === 'cta') continue;
    tocNum++;
    const topic = ch.topic ?? ch.type;
    if (topic) tocChapters.push({ num: tocNum, topic });
  }
  if (tocChapters.length > 0) {
    slideDefs.push({ title: '本日の内容', section: 'AGENDA', layout: 'toc', data: { chapters: tocChapters } });
    slideMap.push({ slideNum: slideDefs.length, slidePng: `html-slides/png/slide-${String(slideDefs.length).padStart(3, '0')}.png`, type: 'toc' });
  }

  // アンチ連続ローテーション
  const LAYOUT_ROTATION: Record<string, string[]> = {
    'rich-panel': ['rich-panel', 'stacked-list', 'check-grid', 'key-message', 'icon-matrix', 'insight-split'],
    'step-flow':  ['step-flow', 'stacked-list'],
    'radial':     ['radial', 'feature-cards'],
    'timeline':   ['timeline', 'era-split'],
  };
  const rotateIdx: Record<string, number> = {};

  function antiRepeat(def: SlideDef): SlideDef {
    const variants = LAYOUT_ROTATION[def.layout];
    if (!variants) return def;
    const idx = rotateIdx[def.layout] ?? 0;
    rotateIdx[def.layout] = idx + 1;
    const newLayout = variants[idx % variants.length];
    if (newLayout === def.layout) return def;

    let newData = def.data;
    if (def.layout === 'radial') {
      const items = Array.isArray(def.data.items) ? def.data.items as Array<{ label: string }> : [];
      const points = items.map(i => i.label);
      if (newLayout === 'feature-cards' && items.length <= 3) {
        return { ...def, layout: 'check-grid', data: { ...def.data, points } };
      } else if (newLayout === 'feature-cards') {
        newData = { ...def.data, cards: items.map(i => ({ title: i.label })) };
      } else {
        newData = { ...def.data, points };
      }
    } else if (def.layout === 'step-flow' && newLayout === 'stacked-list') {
      const steps = Array.isArray(def.data.steps) ? def.data.steps as Array<{ title: string }> : [];
      newData = { ...def.data, points: steps.map(s => s.title) };
    }
    return { ...def, layout: newLayout, data: newData };
  }

  const seen = new Set<string>();
  let chNum = 0;

  for (const chapter of script.chapters) {
    if (chapter.type === 'cta') continue;
    chNum++;
    const skipSection = (chapter as { skipSection?: boolean }).skipSection === true;
    if (!skipSection) {
      slideDefs.push({ title: chapter.topic ?? chapter.type, section: chapter.type, layout: 'section', data: { num: chNum } });
      slideMap.push({ slideNum: slideDefs.length, slidePng: `html-slides/png/slide-${String(slideDefs.length).padStart(3, '0')}.png`, type: 'section' });
    }

    const slidableLines = chapter.lines.filter(l => {
      if (!l.visual) return false;
      if (visualToSlide(l.visual, '', chartData) === null) return false;
      return true;
    });

    const handled = new Set<number>();
    for (let i = 0; i < slidableLines.length; i++) {
      if (handled.has(i)) continue;
      const line = slidableLines[i];
      const v = line.visual!;
      const combineNext   = (v as { combineNext?: number }).combineNext ?? 0;
      const combineLayout = (v as { combineLayout?: 'dual-panel' | 'triple-panel' | 'stat-grid' }).combineLayout;
      const combineMode   = (v as { combineMode?: string }).combineMode;
      const combineTitle  = (v as { combineTitle?: string }).combineTitle;

      if (combineNext > 0 && combineLayout) {
        const groupLines = [line];
        for (let j = 1; j <= combineNext && i + j < slidableLines.length; j++) {
          groupLines.push(slidableLines[i + j]);
          handled.add(i + j);
        }
        const def = buildCombinedSlide(groupLines, combineLayout, combineMode, chartData, chapter.topic ?? chapter.type, combineTitle);
        slideDefs.push(def);
        const audioFiles = groupLines.map(l => (l as { audioFile?: string }).audioFile).filter((x): x is string => !!x);
        slideMap.push({
          slideNum: slideDefs.length,
          slidePng: `html-slides/png/slide-${String(slideDefs.length).padStart(3, '0')}.png`,
          type: 'visual',
          audioFiles,
          ...(audioFiles[0] ? { audioFile: audioFiles[0] } : {}),
        });
      } else {
        const key = v.type === 'chart' ? `chart:${(v as ChartVisual).key}`
                  : v.type === 'stat'  ? `stat:${(v as StatVisual).value}` : null;
        if (key) { if (seen.has(key)) continue; seen.add(key); }
        const defOrDefs = visualToSlide(v as Visual, chapter.topic ?? chapter.type, chartData);
        if (!defOrDefs) continue;
        const defs = Array.isArray(defOrDefs) ? defOrDefs : [defOrDefs];
        const audioFile = (line as { audioFile?: string }).audioFile;
        for (let di = 0; di < defs.length; di++) {
          slideDefs.push(antiRepeat(defs[di]));
          slideMap.push({
            slideNum: slideDefs.length,
            slidePng: `html-slides/png/slide-${String(slideDefs.length).padStart(3, '0')}.png`,
            type: 'visual',
            ...(di === 0 && audioFile ? { audioFile, audioFiles: [audioFile] } : {}),
          });
        }
      }
    }
  }

  // HTML 書き出し
  const htmlFiles: string[] = [];
  slideDefs.forEach((def, i) => {
    const html  = renderSlide(def);
    const fname = `slide-${String(i + 1).padStart(3, '0')}.html`;
    const fpath = path.join(outDir, fname);
    fs.writeFileSync(fpath, html, 'utf-8');
    htmlFiles.push(fpath);
  });

  fs.writeFileSync(path.join(outDir, 'index.html'), buildIndex(htmlFiles, script.title), 'utf-8');
  console.log(`[html-slides] HTML: ${htmlFiles.length} 枚 → ${outDir}`);

  fs.writeFileSync(path.join(outDir, 'slide-map.json'), JSON.stringify(slideMap, null, 2), 'utf-8');
  console.log(`[html-slides] slide-map.json: ${slideMap.length} エントリ`);

  if (!noPng) {
    await exportPngs(htmlFiles, pngDir);
    for (let i = 0; i < htmlFiles.length; i++) {
      const srcPng  = path.join(pngDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
      const destPng = path.join(publicPngDir, `slide-${String(i + 1).padStart(3, '0')}.png`);
      if (fs.existsSync(srcPng)) fs.copyFileSync(srcPng, destPng);
    }
    console.log(`[html-slides] public/html-slides/png/ にコピー完了`);
  }
}

main().catch(err => { console.error('[html-slides] エラー:', err); process.exit(1); });
