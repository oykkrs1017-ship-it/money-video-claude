/**
 * PreToolUse hook: 破壊的削除コマンドの検出と警告
 * rm -rf / del /f / powershell Remove-Item -Recurse などを検出してブロックする。
 */
const fs = require('fs');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';

const DANGEROUS_PATTERNS = [
  /rm\s+-rf?\s+[^-]/,          // rm -rf <path>
  /rm\s+--force/,
  /del\s+\/[fF]/,              // del /f
  /rmdir\s+\/[sS]/,            // rmdir /s
  /Remove-Item.*-Recurse.*-Force/i,
  /Remove-Item.*-Force.*-Recurse/i,
];

const SAFE_PATTERNS = [
  /rm\s+-rf?\s+node_modules/,  // node_modules 削除は許可
  /rm\s+-rf?\s+\.next/,        // .next キャッシュ削除は許可
  /rm\s+-rf?\s+dist\//,        // dist 削除は許可
  /rm\s+-rf?\s+output\/\*\.png/,  // PNG still ファイル削除は許可
];

const isDangerous = DANGEROUS_PATTERNS.some(p => p.test(cmd));
const isSafe = SAFE_PATTERNS.some(p => p.test(cmd));

if (isDangerous && !isSafe) {
  process.stderr.write(
    `[delete-check] ⚠️  破壊的削除コマンドを検出しました:\n  ${cmd.slice(0, 200)}\n` +
    `  Claude Code の deny リスト（Bash(rm -rf *)）で制御されています。\n` +
    `  意図的な削除の場合はユーザーが直接実行してください。\n`
  );
  process.exit(1);
}

process.stdout.write(raw);
