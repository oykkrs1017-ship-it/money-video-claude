#!/usr/bin/env node
/**
 * SessionEnd hook: LLM を547bばず、終了時点の決定的スナップショットだけ残す。
 * SessionEnd の既定予算は 1.5s。settings.json で timeout を 8 に上げること。
 *
 * 書き先（.gitignore 済み）:
 *   .claude/logs/sessions/YYYY-MM-DD_<sid8>.json
 *   .claude/logs/session-index.jsonl
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

function sh(cmd, args, cwd, timeout) {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8', timeout, windowsHide: true });
  return ((r.stdout || '') + (r.stderr || '')).trim();
}

const event = readEvent();
const projectRoot = path.resolve(__dirname, '..', '..');
const logsDir = path.join(projectRoot, '.claude', 'logs');
const sessionsDir = path.join(logsDir, 'sessions');

try {
  fs.mkdirSync(sessionsDir, { recursive: true });
} catch {
  process.exit(0);
}

const sid = String(event.session_id || 'unknown');
const sid8 = sid.slice(0, 8);
const now = new Date();
const date = now.toISOString().slice(0, 10);
const stamp = now.toISOString();
const outFile = path.join(sessionsDir, `${date}_${sid8}.json`);

// 同一 session_id の二重書き込みを避ける（/clear 連打対策）
if (fs.existsSync(outFile)) {
  try {
    const prev = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    const prevMs = Date.parse(prev.ended_at || '') || 0;
    if (Date.now() - prevMs < 90 * 1000) process.exit(0);
  } catch {
    /* overwrite */
  }
}

const branch = sh('git', ['rev-parse', '--abbrev-ref', 'HEAD'], projectRoot, 1500) || '';
const status = sh('git', ['status', '--short'], projectRoot, 1500)
  .split(/\r?\n/)
  .filter(Boolean)
  .slice(0, 30);

const snapshot = {
  ended_at: stamp,
  session_id: sid,
  reason: event.reason || 'other',
  cwd: event.cwd || process.cwd(),
  branch,
  dirty_count: status.length,
  dirty: status,
  transcript_path: event.transcript_path || null,
};

try {
  fs.writeFileSync(outFile, JSON.stringify(snapshot, null, 2));
  fs.appendFileSync(
    path.join(logsDir, 'session-index.jsonl'),
    JSON.stringify({
      ended_at: stamp,
      session_id: sid,
      reason: snapshot.reason,
      branch,
      dirty_count: status.length,
      file: path.relative(projectRoot, outFile).replace(/\\/g, '/'),
    }) + '\n'
  );
} catch {
  /* disk full 等は黙って終了。SessionEnd をブロックしない */
}

process.exit(0);
