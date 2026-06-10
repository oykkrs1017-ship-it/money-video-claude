/**
 * PostToolUse hook: 音声生成後の WAV ファイル整合性チェック
 * generate-voices.ts 実行後に public/voices/ の WAV 数と YAML の line 数を比較する。
 */
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';
if (!cmd.includes('generate-voices')) {
  process.stdout.write(raw);
  process.exit(0);
}

const exitCode = (event.tool_result || {}).exit_code;
if (exitCode !== 0 && exitCode !== undefined) {
  process.stdout.write(raw);
  process.exit(0);
}

// --input フラグから epId を抽出
const inputMatch = cmd.match(/--input\s+input\/([^.\s]+)\.ya?ml/);
if (!inputMatch) { process.stdout.write(raw); process.exit(0); }

const epId = inputMatch[1];
const projectRoot = path.resolve(__dirname, '..', '..');
const pkgDir = path.join(projectRoot, 'packages', 'tech-geopolitics-channel');
const voicesDir = path.join(pkgDir, 'public', 'voices');
const yamlPath = path.join(pkgDir, 'input', `${epId}.yaml`);

let wavCount = 0;
let lineCount = 0;

try {
  const files = fs.readdirSync(voicesDir);
  wavCount = files.filter(f => f.startsWith(epId) && f.endsWith('.wav')).length;
} catch { process.stdout.write(raw); process.exit(0); }

try {
  const yaml = fs.readFileSync(yamlPath, 'utf8');
  // ponchan: または maro: で始まる行を数える
  lineCount = (yaml.match(/^\s+(ponchan|maro):/mg) || []).length;
} catch { process.stdout.write(raw); process.exit(0); }

if (lineCount > 0 && wavCount < lineCount) {
  process.stderr.write(
    `\n[audio-validator] ⚠️  WAVファイル不足: ${wavCount}/${lineCount} 件\n` +
    `  欠損している音声があります。generate-voices を再実行してください。\n\n`
  );
} else if (wavCount >= lineCount && lineCount > 0) {
  process.stderr.write(
    `[audio-validator] ✅ WAV: ${wavCount}/${lineCount} 件（OK）\n`
  );
}

process.stdout.write(raw);
