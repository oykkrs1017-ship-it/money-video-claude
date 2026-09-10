#!/usr/bin/env node
/**
 * PreCompact hook: compact で会話が消える前に、次セッション用の短い手渡しを書く。
 * LLM は使わない。git と既存セッションスナップショットだけ。
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

function readEvent() {
  try {
    return JSON.parse(fs.readFileSync(0, 'utf8') || '{}');
  } catch {
    return {};
  }
}

function sh(cmd, args, cwd) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout: 2000, windowsHide: true });
  return ((r.stdout || '') + (r.stderr || '')).trim();
}

const event = readEvent();
const projectRoot = path.resolve(__dirname, '..', '..');
const logsDir = path.join(projectRoot, '.claude', 'logs');
try {
  fs.mkdirSync(logsDir, { recursive: true });
} catch {
  process.exit(0);
}

const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], projectRoot);
const dirty = sh('git', ['status', '--short'], projectRoot);
const logOneline = sh('git', ['log', '-5', '--oneline'], projectRoot);

const body = [
  `# handoff`,
  ``,
  `- at: ${new Date().toISOString()}`,
  `- trigger: PreCompact (${event.trigger || 'unknown'})`,
  `- session_id: ${event.session_id || ''}`,
  `- branch: ${branch}`,
  ``,
  `## dirty`,
  '```',
  dirty || '(clean)',
  '```',
  ``,
  `## recent commits`,
  '```',
  logOneline || '(none)',
  '```',
  ``,
  `## next session`,
  `- Read this file and tasks/todo.md 「進行中」 only.`,
  `- Do not dump tasks/lessons.md unless a failure repeats.`,
  `- Durable new lesson → /session-end. Otherwise continue the work.`,
  ``,
].join('\n');

try {
  fs.writeFileSync(path.join(logsDir, 'handoff.md'), body);
} catch {
  /* ignore */
}

process.exit(0);
