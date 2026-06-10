/**
 * PreToolUse hook: script-input.json 同期忘れ検知 + output 膨張警告（Tip 24）
 *
 * 1. input/ep*.json を編集するコマンドが来たとき、script-input.json との差分を警告
 * 2. output/ に PNG が 50 枚以上あれば警告（蓄積防止）
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const toolName = event.tool_name || '';
const toolInput = event.tool_input || {};
const projectRoot = path.resolve(__dirname, '..', '..');

// ---- 1. script-input.json 同期チェック（Write/Edit ツール対象） ----
if (toolName === 'Write' || toolName === 'Edit') {
  const filePath = (toolInput.file_path || '').replace(/\\/g, '/');
  const epMatch = filePath.match(/input\/(ep\d+)\.json$/);

  if (epMatch) {
    const epId = epMatch[1];
    const scriptInput = path.join(projectRoot, 'packages', 'tech-geopolitics-channel', 'input', 'script-input.json');

    // script-input.json が存在すれば差分チェック
    if (fs.existsSync(scriptInput)) {
      const result = spawnSync('node', [
        '-e',
        `const a=require(${JSON.stringify(filePath)});const b=require(${JSON.stringify(scriptInput)});` +
        `if(a.id!==b.id)process.stderr.write("[sync-check] ⚠️  script-input.json が " + b.id + " のままです。\\n  cp input/${epId}.json input/script-input.json を忘れずに。\\n");`
      ], { encoding: 'utf8', timeout: 5000 });

      if (result.stderr) process.stderr.write(result.stderr);
    }
  }
}

// ---- 2. output/ PNG 膨張警告（Bash ツール対象） ----
if (toolName === 'Bash') {
  const cmd = toolInput.command || '';
  // レンダリング系コマンド実行時のみチェック
  if (/remotion\s+(render|still)/.test(cmd)) {
    const outputDir = path.join(projectRoot, 'packages', 'tech-geopolitics-channel', 'output');
    if (fs.existsSync(outputDir)) {
      const pngCount = fs.readdirSync(outputDir).filter(f => f.endsWith('.png')).length;
      if (pngCount >= 50) {
        process.stderr.write(
          `[sync-check] ⚠️  output/ に PNG が ${pngCount} 枚蓄積されています。\n` +
          `  レンダリング後に output-cleanup を実行することを検討してください。\n`
        );
      }
    }
  }
}

process.stdout.write(raw);
