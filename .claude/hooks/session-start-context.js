#!/usr/bin/env node
/**
 * SessionStart hook: 巨大な lessons.md / todo.md を毎セッション読ませず、
 * 直近の決定的コンテキストだけ additionalContext として注入する。
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

function firstHeading(filePath) {
  try {
    const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
    const h = lines.find((l) => /^##\s+/.test(l));
    return h ? h.replace(/^##\s+/, '').trim() : '';
  } catch {
    return '';
  }
}

function latestSessionMeta(sessionsDir) {
  try {
    const files = fs
      .readdirSync(sessionsDir)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();
    if (!files.length) return null;
    const raw = JSON.parse(fs.readFileSync(path.join(sessionsDir, files[0]), 'utf8'));
    return {
      ended_at: raw.ended_at || files[0],
      dirty_count: raw.dirty_count || 0,
      reason: raw.reason || '',
      branch: raw.branch || '',
    };
  } catch {
    return null;
  }
}

const event = readEvent();
const projectRoot = path.resolve(__dirname, '..', '..');
const handoffPath = path.join(projectRoot, '.claude', 'logs', 'handoff.md');
const sessionsDir = path.join(projectRoot, '.claude', 'logs', 'sessions');
const lessonsPath = path.join(projectRoot, 'tasks', 'lessons.md');

const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], projectRoot);
const dirty = sh('git', ['status', '--short'], projectRoot)
  .split(/\r?\n/)
  .filter(Boolean);
const lastLesson = firstHeading(lessonsPath);
const lastSession = latestSessionMeta(sessionsDir);

let handoff = '';
try {
  if (fs.existsSync(handoffPath)) {
    const st = fs.statSync(handoffPath);
    const ageH = (Date.now() - st.mtimeMs) / 36e5;
    if (ageH < 48) {
      handoff = fs.readFileSync(handoffPath, 'utf8').trim().slice(0, 700);
    }
  }
} catch {
  /* ignore */
}

const lines = [
  `[session-start] source=${event.source || 'startup'} branch=${branch || '?'} dirty=${dirty.length}`,
  lastLesson ? `latest lesson: ${lastLesson.slice(0, 120)}` : '',
  lastSession
    ? `last session end: ${lastSession.ended_at} reason=${lastSession.reason} dirty=${lastSession.dirty_count}`
    : '',
  dirty.length ? `unstaged:\n${dirty.slice(0, 12).join('\n')}` : 'working tree clean',
  'Do not slurp tasks/lessons.md or the full todo.md. Read only the 進行中 section of tasks/todo.md if needed.',
  'Session wrap: run /session-end only when there is a NEW durable lesson or an unfinished handoff. Otherwise skip.',
];

if (handoff) {
  lines.push('--- handoff.md ---', handoff);
}

const additionalContext = lines.filter(Boolean).join('\n').slice(0, 1800);

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'SessionStart',
      additionalContext,
    },
  })
);
