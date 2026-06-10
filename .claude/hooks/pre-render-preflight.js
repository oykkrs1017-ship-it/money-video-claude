/**
 * PreToolUse hook: npx remotion render 前のプリフライトチェック
 *
 * 1. image ビジュアル参照ファイルの実在確認（ep013失敗の再発防止）
 * 2. WAV ファイル数 >= JSON 音声行数
 * 3. infographic PNG 数 >= JSON の infographic ビジュアル数
 *
 * 不足があれば exit 1 でレンダリングをブロックする。
 */
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';
if (!/npx\s+remotion\s+render/.test(cmd)) {
  process.stdout.write(raw);
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..', '..');
const pkgDir = path.join(projectRoot, 'packages', 'tech-geopolitics-channel');
const scriptInputPath = path.join(pkgDir, 'input', 'script-input.json');

if (!fs.existsSync(scriptInputPath)) {
  process.stderr.write('[pre-render] ⚠️  script-input.json が見つかりません。\n');
  process.stdout.write(raw);
  process.exit(0);
}

let script;
try {
  script = JSON.parse(fs.readFileSync(scriptInputPath, 'utf8'));
} catch (e) {
  process.stderr.write(`[pre-render] ⚠️  script-input.json のパースに失敗: ${e.message}\n`);
  process.stdout.write(raw);
  process.exit(0);
}

const epId = script.id || 'unknown';
const errors = [];

// ---- 1. image ビジュアルの参照ファイル存在確認 ----
const missingImages = [];
(script.chapters || []).forEach(ch => {
  (ch.lines || []).forEach(line => {
    const visual = line.visual;
    if (visual && visual.type === 'image' && visual.src) {
      const imgPath = path.join(pkgDir, 'public', visual.src);
      if (!fs.existsSync(imgPath)) {
        missingImages.push(visual.src);
      }
    }
  });
});
if (missingImages.length > 0) {
  errors.push(
    `image ビジュアルの参照ファイルが不足 (${missingImages.length}件):\n` +
    missingImages.map(s => `    - ${s}`).join('\n')
  );
}

// ---- 2. WAV ファイル数チェック ----
const voicesDir = path.join(pkgDir, 'public', 'voices');
let wavCount = 0;
if (fs.existsSync(voicesDir)) {
  wavCount = fs.readdirSync(voicesDir).filter(f => f.startsWith(epId) && f.endsWith('.wav')).length;
}
let voiceLineCount = 0;
(script.chapters || []).forEach(ch => {
  (ch.lines || []).forEach(line => {
    if (line.character || line.text) voiceLineCount++;
  });
});
if (voiceLineCount > 0 && wavCount < voiceLineCount) {
  errors.push(`WAVファイル不足: ${wavCount}/${voiceLineCount} 件 — generate-voices を実行してください`);
}

// ---- 3. infographic PNG 存在確認 ----
const imagesDir = path.join(pkgDir, 'public', 'images');
let infographicPngCount = 0;
if (fs.existsSync(imagesDir)) {
  infographicPngCount = fs.readdirSync(imagesDir).filter(f => f.startsWith(epId) && f.endsWith('.png')).length;
}
let infographicVisualCount = 0;
(script.chapters || []).forEach(ch => {
  (ch.lines || []).forEach(line => {
    if (line.visual && line.visual.type === 'infographic') infographicVisualCount++;
  });
  // 旧スキーマ互換
  (ch.visuals || []).forEach(v => {
    if (v.type === 'infographic') infographicVisualCount++;
  });
});
if (infographicVisualCount > 0 && infographicPngCount < infographicVisualCount) {
  errors.push(
    `infographic PNG 不足: ${infographicPngCount}/${infographicVisualCount} 件 — generate-infographics を実行してください`
  );
}

// ---- 結果出力 ----
if (errors.length > 0) {
  process.stderr.write(
    `\n[pre-render] ❌ レンダリング前チェック失敗 (${epId})\n\n` +
    errors.map((e, i) => `  ${i + 1}. ${e}`).join('\n\n') +
    '\n\n上記を解消してから再実行してください。\n\n'
  );
  process.exit(2);
} else {
  process.stderr.write(`[pre-render] ✅ プリフライトOK (${epId}): images/WAV/infographic すべて揃っています\n`);
  process.stdout.write(raw);
}
