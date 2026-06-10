/**
 * PreToolUse hook: git commit 前の品質チェック
 * console.log の残留・台本YAML の input/ 外への誤保存を検出する。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';
if (!cmd.match(/git\s+commit/)) {
  process.stdout.write(raw);
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..', '..');
const issues = [];

// 1. ステージング済みファイルで console.log を検出
const diff = spawnSync('git', ['diff', '--cached', '--name-only'], {
  cwd: projectRoot,
  shell: true,
  encoding: 'utf8',
});
const stagedFiles = (diff.stdout || '').trim().split('\n').filter(Boolean);

const tsFiles = stagedFiles.filter(f => (f.endsWith('.ts') || f.endsWith('.tsx')) && !f.includes('__tests__'));
for (const f of tsFiles) {
  const fullPath = path.join(projectRoot, f);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    const matches = content.match(/^\s*console\.log\(/mg);
    if (matches) {
      issues.push(`  console.log が残っています: ${f} (${matches.length}箇所)`);
    }
  } catch { /* ファイルが存在しない（削除済み）場合はスキップ */ }
}

// 2. input/ 外に .yaml/.yml が誤保存されていないか
const yamlOutside = stagedFiles.filter(f =>
  (f.endsWith('.yaml') || f.endsWith('.yml')) &&
  !f.includes('input/') &&
  !f.includes('.claude/') &&
  !f.match(/^packages\/[^/]+\/(package\.json|tsconfig)/)
);
if (yamlOutside.length > 0) {
  issues.push(`  台本YAMLが input/ 外に置かれています:\n` + yamlOutside.map(f => `    ${f}`).join('\n'));
}

if (issues.length > 0) {
  process.stderr.write(
    `\n[pre-commit-qa] ⚠️  コミット前チェックで問題を検出しました:\n` +
    issues.join('\n') +
    `\n  修正してから再コミットしてください。\n\n`
  );
  process.exit(1);
}

process.stdout.write(raw);
