/**
 * PostToolUse hook: TypeScript 型チェック
 * Edit/Write で .ts ファイルを変更した直後に tsc --noEmit を実行する。
 */
const { spawnSync } = require('child_process');
const path = require('path');

const raw = require('fs').readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const filePath = (event.tool_input || {}).file_path || '';
if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
  process.stdout.write(raw);
  process.exit(0);
}

// パッケージルートを特定（packages/ 配下の .ts ファイルに限定）
const projectRoot = path.resolve(__dirname, '..', '..');
const rel = path.relative(projectRoot, filePath).replace(/\\/g, '/');
const pkgMatch = rel.match(/^packages\/([^/]+)\//);
if (!pkgMatch) { process.stdout.write(raw); process.exit(0); }

const pkgName = pkgMatch[1];
const pkgDir = path.join(projectRoot, 'packages', pkgName);

const result = spawnSync('npx', ['tsc', '--noEmit', '--pretty'], {
  cwd: pkgDir,
  shell: true,
  encoding: 'utf8',
  timeout: 30000,
});

if (result.status !== 0) {
  const out = (result.stdout || '') + (result.stderr || '');
  process.stderr.write(`[ts-typecheck] ${pkgName}: ${out.slice(0, 600)}\n`);
}
process.stdout.write(raw);
