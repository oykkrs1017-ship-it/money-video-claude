/**
 * patch-visuals.js
 *
 * generate-script.ts --html-slides が生成した ep{N}.json は
 * chart/stat/rich-panel しか持たない。
 * ep{N}-slides.json のカスタムビジュアル（bar-diff/donut-center/vs-battle/
 * color-cards/step-icons/data-table）を ep{N}.json に差し替える。
 *
 * 使い方:
 *   node scripts/patch-visuals.js --ep ep020
 *
 * 注意:
 *   lineToSlide マッピングは ep{N}.json の構造（出力ライン番号）と
 *   ep{N}-slides.json のスライドインデックスの対応を事前確認して設定すること。
 *   確認コマンド:
 *     node -e "const j=require('./input/ep{N}.json');let n=0;
 *       j.chapters.forEach(ch=>{console.log('='+ch.type);
 *       ch.lines.forEach(l=>{n++;const v=l.visual?l.visual.type:'none';
 *       console.log(n+'|'+l.speaker+'|'+v+'|'+(l.text||'').substring(0,30))})});"
 */

const fs = require('fs');
const path = require('path');

// ─── 引数解析 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const epIdx = args.indexOf('--ep');
const epId = epIdx >= 0 && args[epIdx + 1] ? args[epIdx + 1] : null;

if (!epId) {
  console.error('使い方: node scripts/patch-visuals.js --ep ep020');
  process.exit(1);
}

const packageRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(packageRoot, 'input', `${epId}.json`);
const slidesPath = path.join(packageRoot, 'input', `${epId}-slides.json`);
const outputPath = path.join(packageRoot, 'input', 'script-input.json');

if (!fs.existsSync(scriptPath)) {
  console.error(`❌ ${scriptPath} が見つかりません`);
  process.exit(1);
}
if (!fs.existsSync(slidesPath)) {
  console.error(`❌ ${slidesPath} が見つかりません`);
  process.exit(1);
}

const script = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
const slides = JSON.parse(fs.readFileSync(slidesPath, 'utf-8'));

// ─── スライドインデックスで lookup ──────────────────────────────────────────
const slideLookup = {};
for (const slide of slides.slides) {
  slideLookup[slide.index] = slide;
}

// ─── lineToSlide マッピングを自動生成 ───────────────────────────────────────
// 各 chapter (role) 内で visual を持つラインを、
// ep{N}-slides.json の同 role のスライドに順序で対応させる。
// 手動調整が必要な場合は MANUAL_OVERRIDES を使う。
const MANUAL_OVERRIDES = {
  // lineNum: slideIndex  ← ここに手動上書きを記述
  // 例: 32: 18,   // analysis内の「3社比較」ラインをdata-tableに
};

// role → slides.json の同 role スライドリスト（index順）
const slidesByRole = {};
for (const slide of slides.slides) {
  const r = slide.role;
  if (!slidesByRole[r]) slidesByRole[r] = [];
  slidesByRole[r].push(slide);
}

// 各 chapter の visual ラインを順に対応付ける
const lineToSlide = { ...MANUAL_OVERRIDES };
let lineNum = 0;
const rolePointer = {}; // role → 次に割り当てるスライドポインタ

for (const ch of script.chapters) {
  const role = ch.type;
  if (!rolePointer[role]) rolePointer[role] = 0;

  for (const line of ch.lines) {
    lineNum++;
    if (lineNum in lineToSlide) continue; // 手動上書きを優先

    if (line.visual) {
      const roleSlides = slidesByRole[role] || [];
      const slideForLine = roleSlides[rolePointer[role]];
      if (slideForLine) {
        lineToSlide[lineNum] = slideForLine.index;
        rolePointer[role]++;
      }
    }
  }
}

// ─── パッチ適用 ─────────────────────────────────────────────────────────────
lineNum = 0;
let patched = 0;

for (const ch of script.chapters) {
  for (const line of ch.lines) {
    lineNum++;
    const si = lineToSlide[lineNum];
    if (!si) continue;

    const slide = slideLookup[si];
    if (!slide) { console.warn(`⚠️  slide ${si} が見つかりません (line ${lineNum})`); continue; }

    if (slide.visual) {
      // カスタムビジュアル（bar-diff/donut-center/vs-battle/color-cards/step-icons/data-table）
      // slide.leadText がある場合は visual に merge して渡す（def.data.leadText に到達させるため）
      line.visual = slide.leadText ? { ...slide.visual, leadText: slide.leadText } : slide.visual;
      console.log(`line${lineNum}(slide${si}) → ${slide.visual.type}${slide.leadText ? ' +leadText' : ''}`);
    } else if (slide.chartType && slide.chartType !== 'none' && slide.chartData && slide.chartData.length > 0) {
      // 標準チャート: chartData を ep{N}-slides.json の値（色付き）で上書き
      const key = `slide_${String(si).padStart(3, '0')}_chart`;
      if (!script.chartData) script.chartData = {};
      script.chartData[key] = {
        title: slide.title,
        chartType: slide.chartType,
        data: slide.chartData.map(d => ({ label: d.label, value: d.value })),
      };
      line.visual = {
        type: 'chart',
        key,
        ...(slide.leadText ? { leadText: slide.leadText } : {}),
      };
      console.log(`line${lineNum}(slide${si}) → chart(${slide.chartType}) key=${key}${slide.leadText ? ' +leadText' : ''}`);
    } else {
      // chartType:none かつ visual なし → rich-panel などはそのまま維持
      console.log(`line${lineNum}(slide${si}) → skip (chartType:none, no custom visual)`);
      continue;
    }
    patched++;
  }
}

fs.writeFileSync(outputPath, JSON.stringify(script, null, 2), 'utf-8');
console.log(`\n✅ ${patched}ライン修正完了 → ${outputPath}`);
console.log('次のステップ: npm run html:generate -- --input ./input/script-input.json');
