/**
 * PostToolUse hook: input/ep*.json → script-input.json 自動同期
 * YAML編集後に対応するJSONを書いた時点で即座に同期する。
 * 手動の cp コマンドを不要にする。
 */
const path = require('path');
const fs = require('fs');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const filePath = ((event.tool_input || {}).file_path || '').replace(/\\/g, '/');

// input/ep*.json のみ対象（script-input.json 自体・YAML・その他は除外）
const epJsonMatch = filePath.match(/input\/(ep[\w]+)\.json$/);
if (!epJsonMatch || filePath.includes('script-input')) {
  process.stdout.write(raw);
  process.exit(0);
}

const epId = epJsonMatch[1];
const scriptInputPath = path.join(path.dirname(filePath.replace(/\//g, path.sep)), 'script-input.json');

// 絶対パスに変換（相対パスの場合はプロジェクトルート基準）
const absFilePath = path.isAbsolute(filePath)
  ? filePath.replace(/\//g, path.sep)
  : path.resolve(__dirname, '..', '..', filePath.replace(/\//g, path.sep));
const absScriptInput = path.isAbsolute(scriptInputPath)
  ? scriptInputPath
  : path.resolve(path.dirname(absFilePath), 'script-input.json');

try {
  fs.copyFileSync(absFilePath, absScriptInput);
  process.stderr.write(`[auto-sync] ✅ ${epId}.json → script-input.json を自動同期しました\n`);
} catch (err) {
  process.stderr.write(`[auto-sync] ⚠️  同期失敗: ${err.message}\n`);
}

process.stdout.write(raw);
