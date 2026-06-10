/**
 * PostToolUse hook: Prettier 自動フォーマット（Tip 10）
 * Edit/Write で .ts/.tsx/.json/.yaml/.yml ファイルを変更した直後に prettier --write を実行する。
 */
const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const filePath = (event.tool_input || {}).file_path || '';
const ext = path.extname(filePath).toLowerCase();
const SUPPORTED = ['.ts', '.tsx', '.json', '.yaml', '.yml'];

if (!SUPPORTED.includes(ext)) {
  process.stdout.write(raw);
  process.exit(0);
}

// hooks/ や rules/ 配下の設定ファイルは整形しない（壊れやすい）
const normalized = filePath.replace(/\\/g, '/');
if (normalized.includes('/.claude/') || normalized.includes('/node_modules/')) {
  process.stdout.write(raw);
  process.exit(0);
}

// packages/ 配下のみ対象
const projectRoot = path.resolve(__dirname, '..', '..');
const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');
if (!rel.startsWith('packages/')) {
  process.stdout.write(raw);
  process.exit(0);
}

// prettier が存在するパッケージルートを特定
const pkgMatch = rel.match(/^packages\/([^/]+)\//);
if (!pkgMatch) { process.stdout.write(raw); process.exit(0); }

const pkgDir = path.join(projectRoot, 'packages', pkgMatch[1]);
const prettierBin = path.join(pkgDir, 'node_modules', '.bin', 'prettier');

if (!fs.existsSync(prettierBin)) {
  // prettier が未インストールの場合はスキップ（エラーにしない）
  process.stdout.write(raw);
  process.exit(0);
}

const result = spawnSync(prettierBin, ['--write', '--log-level', 'warn', filePath], {
  cwd: pkgDir,
  shell: false,
  encoding: 'utf8',
  timeout: 12000,
});

if (result.status !== 0) {
  const out = (result.stdout || '') + (result.stderr || '');
  process.stderr.write(`[prettier] ${path.basename(filePath)}: ${out.slice(0, 300)}\n`);
}

process.stdout.write(raw);
