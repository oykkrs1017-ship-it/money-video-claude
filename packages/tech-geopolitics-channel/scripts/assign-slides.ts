/**
 * assign-slides.ts
 *
 * generate-html-slides.ts（html:generate）が生成した slide-map.json を修正し、
 * 全スライドを動画に挿入できるようにする。
 *
 * 具体的にやること:
 *   1. section エントリにchapterIndexを付与（直後のvisualのaudioFileから推定）
 *   2. cover/toc エントリを visual 化し、hook 先頭のaudioFilesを付与
 *   3. slides.json のスライド数 > slide-map.json のスライド数の場合、
 *      不足分を末尾に追加（PNGはpreviewが生成した slide-014〜N.pngを使用）
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/assign-slides.ts --ep ep022
 *
 * 実行タイミング: html:generate の直後
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── 引数解析 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const epIdx = args.indexOf('--ep');
const epId = epIdx >= 0 && args[epIdx + 1] ? args[epIdx + 1] : null;

if (!epId) {
  console.error('使い方: npx ts-node --transpile-only scripts/assign-slides.ts --ep ep022');
  process.exit(1);
}

const packageRoot  = path.resolve(__dirname, '..');
const slidesPath   = path.join(packageRoot, 'input', `${epId}-slides.json`);
const scriptPath   = path.join(packageRoot, 'input', 'script-input.json');
const slideMapPath = path.join(packageRoot, 'out', 'html-slides', 'slide-map.json');
const publicPngDir = path.join(packageRoot, 'public', 'html-slides', 'png');

for (const p of [slidesPath, scriptPath, slideMapPath]) {
  if (!fs.existsSync(p)) {
    console.error(`❌ ${p} が見つかりません`);
    process.exit(1);
  }
}

// ─── 型定義 ──────────────────────────────────────────────────────────────────

interface SlideMapEntry {
  slideNum: number;
  slidePng: string;
  type: string;
  audioFile?: string;
  audioFiles?: string[];
  chapterIndex?: number;
}

interface ScriptLine {
  audioFile?: string;
}

interface Chapter {
  type: string;
  lines: ScriptLine[];
}

interface ScriptInput {
  chapters: Chapter[];
}

interface SlideEntry {
  index: number;
  role: string;
  visual?: unknown;
  chartType?: string;
  chartData?: unknown[];
}

interface SlidesJson {
  slides: SlideEntry[];
}

// ─── データ読み込み ──────────────────────────────────────────────────────────
const slideMap: SlideMapEntry[]  = JSON.parse(fs.readFileSync(slideMapPath, 'utf-8'));
const scriptInput: ScriptInput   = JSON.parse(fs.readFileSync(scriptPath, 'utf-8'));
const slidesJson: SlidesJson     = JSON.parse(fs.readFileSync(slidesPath, 'utf-8'));

// ─── audioFile → chapterIndex マッピング ─────────────────────────────────────
const audioToChapterIndex = new Map<string, number>();
scriptInput.chapters.forEach((ch, ci) => {
  ch.lines.forEach(line => {
    if (line.audioFile) audioToChapterIndex.set(line.audioFile, ci);
  });
});

// ─── chapter.type → chapterIndex ─────────────────────────────────────────────
const chapterTypeToIndex = new Map<string, number>();
scriptInput.chapters.forEach((ch, ci) => {
  if (!chapterTypeToIndex.has(ch.type)) chapterTypeToIndex.set(ch.type, ci);
});

// ─── role → chapter lines（audioFiles） ──────────────────────────────────────
const linesByRole = new Map<string, ScriptLine[]>();
for (const ch of scriptInput.chapters) {
  const existing = linesByRole.get(ch.type) ?? [];
  linesByRole.set(ch.type, [...existing, ...ch.lines]);
}

// ─── Step 1: sectionエントリにchapterIndexを付与 ─────────────────────────────
// 直後のvisualエントリのaudioFileからchapterIndexを推定する
console.log('\n[assign-slides] Step 1: section → chapterIndex付与');
for (let i = 0; i < slideMap.length; i++) {
  const entry = slideMap[i];
  if (entry.type !== 'section') continue;
  if (entry.chapterIndex !== undefined) {
    console.log(`  slide-${entry.slideNum} [section] chapterIndex=${entry.chapterIndex} (既存)`);
    continue;
  }
  // 直後のvisualエントリを探す
  const nextVisual = slideMap.slice(i + 1).find(e => e.type === 'visual' && e.audioFile);
  if (nextVisual?.audioFile) {
    const ci = audioToChapterIndex.get(nextVisual.audioFile) ?? 0;
    entry.chapterIndex = ci;
    console.log(`  slide-${entry.slideNum} [section] → ch${ci} (${nextVisual.audioFile}から推定)`);
  } else {
    // フォールバック: 前のvisualのchapterIndex + 1
    const prevVisual = slideMap.slice(0, i).reverse().find(e => e.type === 'visual' && e.audioFile);
    const prevCi = prevVisual?.audioFile ? (audioToChapterIndex.get(prevVisual.audioFile) ?? 0) : 0;
    entry.chapterIndex = prevCi + 1;
    console.log(`  slide-${entry.slideNum} [section] → ch${prevCi + 1} (フォールバック)`);
  }
}

// ─── Step 2: cover/tocエントリをvisual化してaudioFilesを付与 ─────────────────
console.log('\n[assign-slides] Step 2: cover/toc → visual変換');
const hookLines = linesByRole.get('hook') ?? [];
const hookAudios = hookLines.map(l => l.audioFile).filter((f): f is string => !!f);

for (const entry of slideMap) {
  if (entry.type !== 'cover' && entry.type !== 'toc') continue;
  if ((entry.audioFiles?.length ?? 0) > 0) {
    console.log(`  slide-${entry.slideNum} [${entry.type}] audioFiles既存: ${entry.audioFiles?.length}本`);
    continue;
  }

  if (entry.type === 'cover') {
    // hookの最初の2セリフを割り当て
    const files = hookAudios.slice(0, 2);
    if (files.length > 0) {
      entry.type = 'visual';
      entry.audioFile = files[0];
      entry.audioFiles = files;
      console.log(`  slide-${entry.slideNum} [cover→visual] audioFiles:${files.length}本`);
    }
  } else if (entry.type === 'toc') {
    // hookの3〜4セリフ目を割り当て（目次紹介）
    const files = hookAudios.slice(2, 4);
    if (files.length > 0) {
      entry.type = 'visual';
      entry.audioFile = files[0];
      entry.audioFiles = files;
      console.log(`  slide-${entry.slideNum} [toc→visual] audioFiles:${files.length}本`);
    }
  }
}

// ─── Step 3: slides.jsonに追加スライドがあれば末尾に追加 ─────────────────────
console.log('\n[assign-slides] Step 3: 追加スライドの検出・追加');
const currentCount = slideMap.length;
const targetCount  = slidesJson.slides.length;

if (targetCount > currentCount) {
  // slides.jsonのrole別スライドリスト
  const slidesByRole = new Map<string, SlideEntry[]>();
  for (const s of slidesJson.slides) {
    const ex = slidesByRole.get(s.role) ?? [];
    slidesByRole.set(s.role, [...ex, s]);
  }

  for (let i = currentCount + 1; i <= targetCount; i++) {
    const pngPath = `html-slides/png/slide-${String(i).padStart(3, '0')}.png`;
    const publicPng = path.join(publicPngDir, `slide-${String(i).padStart(3, '0')}.png`);

    if (!fs.existsSync(publicPng)) {
      console.log(`  slide-${i}: PNG不在のためスキップ (${publicPng})`);
      continue;
    }

    // slides.jsonのi番目スライドのroleからaudioFilesを配分
    const slide = slidesJson.slides[i - 1];
    if (!slide) continue;
    const role = slide.role;
    const roleLines = linesByRole.get(role) ?? [];
    const roleSlidesVisual = (slidesByRole.get(role) ?? []).filter(s => !!(s.visual || (s.chartType && s.chartType !== 'none')));
    const myIdx = roleSlidesVisual.findIndex(s => s.index === slide.index);
    const total = roleLines.length;
    const count = roleSlidesVisual.length;
    const start = count > 0 ? Math.floor(myIdx * total / count) : 0;
    const end   = count > 0 ? Math.floor((myIdx + 1) * total / count) : 0;
    const audios = roleLines.slice(start, end).map(l => l.audioFile).filter((f): f is string => !!f);

    const newEntry: SlideMapEntry = {
      slideNum: i,
      slidePng: pngPath,
      type: 'visual',
      ...(audios[0] ? { audioFile: audios[0], audioFiles: audios } : {}),
    };
    slideMap.push(newEntry);
    console.log(`  slide-${i} [追加] role:${role} audioFiles:${audios.length}本`);
  }
} else {
  console.log(`  slides.json(${targetCount}) ≦ slide-map(${currentCount}): 追加なし`);
}

// ─── Step 4: 全audioFilesをvisualスライドへ均等配分 ──────────────────────────
// 1スライドに1ラインしか割り当てられないと同一スライドが長時間固定表示されるため、
// script-inputの全ラインをvisualスライド数で均等に分割し直す。
console.log('\n[assign-slides] Step 4: 全audioFilesを均等配分');

const allAudioFiles: string[] = [];
for (const ch of scriptInput.chapters) {
  for (const line of ch.lines) {
    if (line.audioFile) allAudioFiles.push(line.audioFile);
  }
}

const visualEntries = slideMap.filter(e => e.type === 'visual').sort((a, b) => a.slideNum - b.slideNum);
const V = visualEntries.length;
const N = allAudioFiles.length;

if (V > 0 && N > 0) {
  visualEntries.forEach((entry, i) => {
    const start = Math.floor(i * N / V);
    const end   = Math.floor((i + 1) * N / V);
    const files = allAudioFiles.slice(start, end);
    if (files.length > 0) {
      entry.audioFile  = files[0];
      entry.audioFiles = files;
      console.log(`  slide-${entry.slideNum} → lines ${start + 1}〜${end} (${files.length}本)`);
    }
  });
}

// ─── 保存 ────────────────────────────────────────────────────────────────────
fs.writeFileSync(slideMapPath, JSON.stringify(slideMap, null, 2), 'utf-8');
const sections = slideMap.filter(e => e.type === 'section').length;
const visuals  = slideMap.filter(e => e.type === 'visual').length;
console.log(`\n✅ slide-map.json 更新完了: ${slideMap.length} エントリ`);
console.log(`   visual: ${visuals} 枚  section: ${sections} 枚`);
console.log('\n次のステップ: Still 確認 → レンダリング');
