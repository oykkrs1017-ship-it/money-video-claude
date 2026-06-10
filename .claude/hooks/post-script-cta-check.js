/**
 * PostToolUse hook: ep*.json 書き込み後の CTA 位置バリデーション
 *
 * ban-avoidance.md / feedback_cta_placement.md のルール:
 * CTA チャプターは chapters 配列の末尾のみ許可。
 * 中間への挿入を検出したら exit 2 でブロック。
 */
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const toolName = event.tool_name || '';
if (toolName !== 'Write') {
  process.stdout.write(raw);
  process.exit(0);
}

const filePath = ((event.tool_input || {}).file_path || '').replace(/\\/g, '/');
if (!filePath.match(/input\/ep\d+\.json$/)) {
  process.stdout.write(raw);
  process.exit(0);
}

let script;
try {
  script = JSON.parse(fs.readFileSync(filePath, 'utf8'));
} catch {
  process.stdout.write(raw);
  process.exit(0);
}

const chapters = script.chapters || [];
const ctaIndices = chapters
  .map((ch, i) => ({ type: ch.type, i }))
  .filter(({ type, i }) => type === 'cta' && i !== chapters.length - 1);

if (ctaIndices.length > 0) {
  const positions = ctaIndices.map(({ i }) => `index ${i}`).join(', ');
  process.stderr.write(
    `\n[cta-check] ❌ CTAが中間チャプターに配置されています (${positions})。\n` +
    `  CTAは chapters の末尾にのみ配置できます（ban-avoidance.md）。\n` +
    `  台本を修正してから保存してください。\n\n`
  );
  process.exit(2);
}

process.stdout.write(raw);
