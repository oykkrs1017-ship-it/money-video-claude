/**
 * PostToolUse hook: YouTube アップロード後の output/ クリーンアップ提案
 * upload-youtube.ts の実行結果を監視し、成功時にゴミファイル一覧を表示する。
 */
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';
// upload-youtube.ts の実行かどうか確認
if (!cmd.includes('upload-youtube')) {
  process.stdout.write(raw);
  process.exit(0);
}

// 成功時のみ（exit_code が 0 または未定義）
const exitCode = (event.tool_result || {}).exit_code;
if (exitCode !== 0 && exitCode !== undefined) {
  process.stdout.write(raw);
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(projectRoot, 'packages', 'tech-geopolitics-channel', 'output');

let cleanupTargets = [];
try {
  const files = fs.readdirSync(outputDir);
  cleanupTargets = files.filter(f =>
    f.endsWith('.png') ||
    f.includes('_test.') ||
    f.match(/_check\.(mp4|png)$/)
  );
} catch {
  process.stdout.write(raw);
  process.exit(0);
}

if (cleanupTargets.length > 0) {
  process.stderr.write(
    `\n[post-upload-cleanup] 📦 アップロード完了。クリーンアップ対象ファイル (${cleanupTargets.length}件):\n` +
    cleanupTargets.map(f => `  output/${f}`).join('\n') +
    `\n  → "output/ をクリーンアップして" と指示してください。\n\n`
  );
}

process.stdout.write(raw);
