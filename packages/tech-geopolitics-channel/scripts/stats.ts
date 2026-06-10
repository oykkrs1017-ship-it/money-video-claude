/**
 * stats.ts
 *
 * 直近N本の視聴維持率・CTR・再生数をターミナルに表示する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/stats.ts          # 直近10本
 *   npx ts-node --transpile-only scripts/stats.ts --n 20   # 直近20本
 *   npx ts-node --transpile-only scripts/stats.ts --collect # collect-analytics 後に表示
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ─── 定数 ─────────────────────────────────────────────────────────────────────

const BOLD   = '\x1b[1m';
const GREEN  = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const DIM    = '\x1b[2m';
const RESET  = '\x1b[0m';

const packageRoot = path.resolve(__dirname, '..');
const brainDir    = path.resolve(packageRoot, '..', '..', 'brain');
const scorecardsDir = path.join(brainDir, 'scorecards');

// ─── 型定義 ───────────────────────────────────────────────────────────────────

interface Engagement {
  collectedAt: string;
  views7d: number;
  likes7d: number;
  comments7d: number;
  avgViewDurationSec: number;
  retentionRate: number;
  ctr: number;
}

interface Scorecard {
  episodeId: string;
  channel: string;
  recordedAt: string;
  videoId?: string;
  verdict: string;
  engagement?: Engagement;
}

// ─── ユーティリティ ───────────────────────────────────────────────────────────

function pad(s: string, width: number, right = false): string {
  const str = String(s);
  const spaces = ' '.repeat(Math.max(0, width - str.length));
  return right ? spaces + str : str + spaces;
}

function fmt(n: number | undefined, unit: string, decimals = 1): string {
  if (n === undefined || n === null) return DIM + '  -  ' + RESET;
  return n.toFixed(decimals) + unit;
}

function fmtViews(n: number | undefined): string {
  if (n === undefined || n === null) return DIM + '  -  ' + RESET;
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

// ─── scorecard 読み込み ───────────────────────────────────────────────────────

function loadScorecards(): Scorecard[] {
  if (!fs.existsSync(scorecardsDir)) {
    console.error(`❌ brain/scorecards/ が見つかりません: ${scorecardsDir}`);
    process.exit(1);
  }
  return fs
    .readdirSync(scorecardsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(scorecardsDir, f), 'utf8')) as Scorecard)
    .filter((sc) => sc.channel === 'tech-geopolitics' && /^ep\d+$/.test(sc.episodeId))
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());
}

// ─── 表示 ─────────────────────────────────────────────────────────────────────

function printTable(cards: Scorecard[]): void {
  const header = [
    pad('ep ID',    10),
    pad('公開日',   12),
    pad('維持率',    8, true),
    pad('CTR',       7, true),
    pad('7日再生',   8, true),
    pad('avg時間',   8, true),
    pad('状態',      6),
  ].join(' │ ');

  const divider = '─'.repeat(header.replace(/\x1b\[[0-9;]*m/g, '').length);

  console.log(`\n${BOLD}${CYAN}📊 直近${cards.length}本のパフォーマンス${RESET}`);
  console.log(divider);
  console.log(BOLD + header + RESET);
  console.log(divider);

  const withData: Scorecard[] = [];

  for (const sc of cards) {
    const e = sc.engagement;
    const date = sc.recordedAt.slice(0, 10);
    const status = e ? GREEN + '✅' + RESET : DIM + '未収集' + RESET;

    const row = [
      pad(sc.episodeId, 10),
      pad(date,         12),
      pad(fmt(e?.retentionRate, '%'),  8, true),
      pad(fmt(e?.ctr, '%'),            7, true),
      pad(fmtViews(e?.views7d),        8, true),
      pad(fmt(e?.avgViewDurationSec !== undefined ? e.avgViewDurationSec / 60 : undefined, 'm'), 8, true),
      status,
    ].join(' │ ');

    console.log(row);
    if (e) withData.push(sc);
  }

  console.log(divider);

  if (withData.length === 0) {
    console.log(
      `\n${YELLOW}⚠  データがまだ収集されていません。${RESET}\n` +
      `   ${DIM}npm run collect-analytics -- --all${RESET}  を実行してください。\n`,
    );
    return;
  }

  // 平均行
  const retentions = withData.map((sc) => sc.engagement!.retentionRate);
  const ctrs       = withData.map((sc) => sc.engagement!.ctr);
  const views      = withData.map((sc) => sc.engagement!.views7d);
  const durations  = withData.map((sc) => sc.engagement!.avgViewDurationSec / 60);

  const avgRow = [
    pad(`平均 (N=${withData.length})`, 10),
    pad('',                           12),
    pad(avg(retentions).toFixed(1) + '%',  8, true),
    pad(avg(ctrs).toFixed(1) + '%',        7, true),
    pad(fmtViews(Math.round(avg(views))),  8, true),
    pad(avg(durations).toFixed(1) + 'm',   8, true),
    '',
  ].join(' │ ');

  console.log(BOLD + avgRow + RESET);
  console.log(divider + '\n');

  // ベンチマーク比較
  const avgRetention = avg(retentions);
  const avgCtr       = avg(ctrs);
  const retEmoji = avgRetention >= 60 ? '🟢' : avgRetention >= 45 ? '🟡' : '🔴';
  const ctrEmoji = avgCtr       >= 7  ? '🟢' : avgCtr       >= 4  ? '🟡' : '🔴';

  console.log(`${retEmoji} 維持率 ${BOLD}${avgRetention.toFixed(1)}%${RESET}  (目標 ≥60%)  ${DIM}業界平均: 45%${RESET}`);
  console.log(`${ctrEmoji} CTR    ${BOLD}${avgCtr.toFixed(1)}%${RESET}  (目標 ≥7%)   ${DIM}業界平均: 4%${RESET}`);
  console.log('');
}

// ─── main ─────────────────────────────────────────────────────────────────────

function main(): void {
  const argv = process.argv.slice(2);
  const nIdx = argv.indexOf('--n');
  const n    = nIdx >= 0 && argv[nIdx + 1] ? parseInt(argv[nIdx + 1]!, 10) : 10;
  const collect = argv.includes('--collect');

  if (collect) {
    console.log(`${CYAN}▶ アナリティクス収集中...${RESET}`);
    execSync(
      `node_modules/.bin/ts-node --transpile-only scripts/collect-analytics.ts --all`,
      { stdio: 'inherit', cwd: packageRoot },
    );
  }

  const cards = loadScorecards().slice(0, n);
  printTable(cards);
}

main();
