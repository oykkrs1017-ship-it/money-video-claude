/**
 * PostToolUse hook: YAML 構文チェック
 * input/*.yaml を Write/Edit した直後に js-yaml でパース検証する。
 */
const path = require('path');
const fs = require('fs');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const filePath = (event.tool_input || {}).file_path || '';
if (!filePath.endsWith('.yaml') && !filePath.endsWith('.yml')) {
  process.stdout.write(raw);
  process.exit(0);
}

// input/ 配下の YAML のみチェック（Remotion設定等は除外）
if (!filePath.includes('/input/') && !filePath.includes('\\input\\')) {
  process.stdout.write(raw);
  process.exit(0);
}

try {
  // プロジェクト内の js-yaml を使用
  const projectRoot = path.resolve(__dirname, '..', '..');
  const yamlMod = require(path.join(projectRoot, 'node_modules', 'js-yaml')) ||
                   require(path.join(projectRoot, 'packages', 'tech-geopolitics-channel', 'node_modules', 'js-yaml'));
  const content = fs.readFileSync(filePath, 'utf8');
  yamlMod.load(content);
} catch (err) {
  process.stderr.write(`[yaml-check] 構文エラー: ${err.message}\n`);
  process.exit(1);
}

process.stdout.write(raw);
