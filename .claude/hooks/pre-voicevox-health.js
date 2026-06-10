/**
 * PreToolUse hook: generate-voices.ts 実行前の VOICEVOX 死活確認
 *
 * VOICEVOX が起動していない場合は exit 2 でブロックし、
 * ECONNREFUSED で混乱する前に明確なメッセージを出す。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';
if (!cmd.includes('generate-voices')) {
  process.stdout.write(raw);
  process.exit(0);
}

const result = spawnSync('curl', ['-s', '--max-time', '3', 'http://localhost:50021/version'], {
  encoding: 'utf8',
  timeout: 5000,
});

if (result.status !== 0 || !result.stdout) {
  process.stderr.write(
    '\n[voicevox-health] ❌ VOICEVOX が起動していません。\n' +
    '  VOICEVOX を起動してから再実行してください。\n' +
    '  確認: curl http://localhost:50021/version\n\n'
  );
  process.exit(2);
}

process.stderr.write(`[voicevox-health] ✅ VOICEVOX 起動確認 (version: ${result.stdout.trim()})\n`);
process.stdout.write(raw);
