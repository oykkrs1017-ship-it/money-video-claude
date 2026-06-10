/**
 * PostToolUse hook: npx remotion render 完了後の MP4 品質レポート
 *
 * ffprobe で最新 mp4 の duration / size を取得して表示する。
 * duration が 3分未満または 20分超の場合は警告。
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const raw = fs.readFileSync(0, 'utf8');
let event;
try { event = JSON.parse(raw); } catch { process.stdout.write(raw); process.exit(0); }

const cmd = (event.tool_input || {}).command || '';
if (!/npx\s+remotion\s+render/.test(cmd)) {
  process.stdout.write(raw);
  process.exit(0);
}

const exitCode = (event.tool_result || {}).exit_code;
if (exitCode !== 0 && exitCode !== undefined) {
  process.stdout.write(raw);
  process.exit(0);
}

const projectRoot = path.resolve(__dirname, '..', '..');
const outputDir = path.join(projectRoot, 'packages', 'tech-geopolitics-channel', 'output');

if (!fs.existsSync(outputDir)) {
  process.stdout.write(raw);
  process.exit(0);
}

// 最新の mp4 を取得
const mp4Files = fs.readdirSync(outputDir)
  .filter(f => f.endsWith('.mp4'))
  .map(f => ({ name: f, mtime: fs.statSync(path.join(outputDir, f)).mtime }))
  .sort((a, b) => b.mtime - a.mtime);

if (mp4Files.length === 0) {
  process.stdout.write(raw);
  process.exit(0);
}

const latestMp4 = path.join(outputDir, mp4Files[0].name);
const result = spawnSync('ffprobe', [
  '-v', 'error',
  '-show_entries', 'format=duration,size',
  '-of', 'default=noprint_wrappers=1',
  latestMp4,
], { encoding: 'utf8', timeout: 10000 });

if (result.status !== 0) {
  process.stdout.write(raw);
  process.exit(0);
}

const durationMatch = result.stdout.match(/duration=(\d+(?:\.\d+)?)/);
const sizeMatch = result.stdout.match(/size=(\d+)/);

if (!durationMatch) {
  process.stdout.write(raw);
  process.exit(0);
}

const durationSec = parseFloat(durationMatch[1]);
const sizeMB = sizeMatch ? (parseInt(sizeMatch[1]) / 1024 / 1024).toFixed(1) : '?';
const min = Math.floor(durationSec / 60);
const sec = Math.floor(durationSec % 60);
const durationStr = `${min}分${String(sec).padStart(2, '0')}秒`;

let icon = '✅';
let warn = '';
if (durationSec < 180) {
  icon = '⚠️';
  warn = ' ← 3分未満（短すぎる可能性）';
} else if (durationSec > 1200) {
  icon = '⚠️';
  warn = ' ← 20分超（長すぎる可能性）';
}

process.stderr.write(
  `\n[post-render] ${icon} ${mp4Files[0].name}: ${durationStr} / ${sizeMB}MB${warn}\n\n`
);

process.stdout.write(raw);
