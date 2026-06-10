/**
 * verdict.ts
 * KEEP / DISCARD / TENTATIVE 判定エンジン（Python verdict_engine.py の TS 移植）
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/verdict.ts [options]
 *
 * オプション:
 *   --ep <episodeId>   特定エピソードを判定して書き込む
 *   --all              全 PENDING エピソードを一括判定（デフォルト）
 *   --channel <name>   チャンネル名（デフォルト: ai-money-shorts）
 *   --dry-run          スコアカードを書き込まず結果を表示のみ
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { EpisodeScorecard, Verdict } from '../../../packages/shared/src/scorecard';
import { loadScorecard, saveScorecard } from '../../../packages/shared/src/scorecard';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

// ─── 判定しきい値 ─────────────────────────────────────────────────────────────

const RETENTION_IMPROVE_THRESHOLD = 3.0;  // baseline + 3% で KEEP
const CTR_IMPROVE_THRESHOLD = 2.0;         // baseline + 2% で KEEP
const ISSUE_REDUCE_THRESHOLD = 0.7;        // baseline × 70% 以下で KEEP
const TENTATIVE_MAX_RETRY = 2;             // TENTATIVE がこの回数続いたら DISCARD

// ─── CLI 引数パース ────────────────────────────────────────────────────────────

function parseArgs(): {
  episodeId: string | null;
  all: boolean;
  channel: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let episodeId: string | null = null;
  let all = false;
  let channel = 'ai-money-shorts';
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--ep' && args[i + 1]) { episodeId = args[i + 1]; i++; }
    if (args[i] === '--all') all = true;
    if (args[i] === '--channel' && args[i + 1]) { channel = args[i + 1]; i++; }
    if (args[i] === '--dry-run') dryRun = true;
  }

  if (!episodeId && !all) all = true; // デフォルト: --all
  return { episodeId, all, channel, dryRun };
}

// ─── スコアカード一覧 ─────────────────────────────────────────────────────────

const ROOT_DIR = path.resolve(__dirname, '../../..');
const SCORECARDS_DIR = path.join(ROOT_DIR, 'brain', 'scorecards');

function loadAllScorecards(channel: string): EpisodeScorecard[] {
  if (!fs.existsSync(SCORECARDS_DIR)) return [];

  const cards: EpisodeScorecard[] = [];
  for (const file of fs.readdirSync(SCORECARDS_DIR)) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = fs.readFileSync(path.join(SCORECARDS_DIR, file), 'utf8');
      const card = JSON.parse(raw) as EpisodeScorecard;
      if (card.channel === channel) cards.push(card);
    } catch {
      // 破損ファイルはスキップ
    }
  }
  return cards;
}

// ─── ベースライン計算 ─────────────────────────────────────────────────────────

interface Baseline {
  retention: number;
  ctr: number;
  issueCount: number;
}

function calcBaseline(
  allCards: EpisodeScorecard[],
  excludeId: string
): Baseline {
  const candidates = allCards
    .filter(
      (c) =>
        c.episodeId !== excludeId &&
        c.hypothesisId === null &&
        (c.verdict === 'KEEP' || c.verdict === 'PENDING') &&
        c.engagement?.retentionRate !== undefined
    )
    .slice(-5); // 最新5件

  if (candidates.length === 0) {
    return { retention: 50.0, ctr: 3.0, issueCount: 2.0 };
  }

  const avg = (vals: number[]) => vals.reduce((a, b) => a + b, 0) / vals.length;

  return {
    retention: avg(candidates.map((c) => c.engagement?.retentionRate ?? 50)),
    ctr: avg(candidates.map((c) => c.engagement?.ctr ?? 3)),
    issueCount: avg(candidates.map((c) => c.production.reviewIssueCount)),
  };
}

// ─── 判定ロジック ─────────────────────────────────────────────────────────────

function judge(card: EpisodeScorecard, allCards: EpisodeScorecard[]): Verdict {
  // エンゲージメント未収集
  if (card.engagement?.retentionRate === undefined) {
    return 'PENDING';
  }

  const baseline = calcBaseline(allCards, card.episodeId);
  const retention = card.engagement.retentionRate ?? 0;
  const ctr = card.engagement.ctr ?? 0;
  const issueCount = card.production.reviewIssueCount;

  // 1. 視聴継続率改善
  if (retention > baseline.retention + RETENTION_IMPROVE_THRESHOLD) {
    return 'KEEP';
  }

  // 2. CTR 改善
  if (ctr > baseline.ctr + CTR_IMPROVE_THRESHOLD) {
    return 'KEEP';
  }

  // 3. 制作品質改善（レビュー指摘減少）
  if (issueCount < baseline.issueCount * ISSUE_REDUCE_THRESHOLD) {
    return 'KEEP';
  }

  // 4. TENTATIVE（同じ仮説 ID で規定回数超えたら DISCARD）
  if (card.hypothesisId) {
    const tentativeCount = allCards.filter(
      (c) => c.hypothesisId === card.hypothesisId && c.verdict === 'TENTATIVE'
    ).length;
    if (tentativeCount >= TENTATIVE_MAX_RETRY) {
      return 'DISCARD';
    }
  }

  return 'TENTATIVE';
}

// ─── スコアカード更新 ─────────────────────────────────────────────────────────

function applyVerdict(card: EpisodeScorecard, verdict: Verdict, dryRun: boolean): void {
  const updated: EpisodeScorecard = { ...card, verdict };
  if (!dryRun) {
    saveScorecard(ROOT_DIR, updated);
  }
}

// ─── メイン処理 ───────────────────────────────────────────────────────────────

function main(): void {
  const { episodeId, all, channel, dryRun } = parseArgs();

  console.log('⚖ 判定エンジン起動');
  if (dryRun) console.log('  [dry-run モード: スコアカードは更新しません]');

  const allCards = loadAllScorecards(channel);

  if (episodeId) {
    // 単体判定
    const card = loadScorecard(ROOT_DIR, episodeId);
    if (!card) {
      console.error(`✗ スコアカードが見つかりません: ${episodeId}`);
      process.exit(1);
    }
    const verdict = judge(card, allCards);
    applyVerdict(card, verdict, dryRun);
    console.log(`✅ ${episodeId}: ${verdict}`);
    return;
  }

  if (all) {
    // 全 PENDING 一括判定
    const pending = allCards.filter(
      (c) =>
        c.verdict === 'PENDING' &&
        c.engagement?.retentionRate !== undefined
    );

    console.log(`  対象: ${pending.length} 件（PENDING かつ engagement 収集済み）`);

    if (pending.length === 0) {
      console.log('  判定対象がありません');
      return;
    }

    const results: Record<string, Verdict> = {};
    for (const card of pending) {
      const verdict = judge(card, allCards);
      applyVerdict(card, verdict, dryRun);
      results[card.episodeId] = verdict;
      console.log(`  ${card.episodeId}: ${verdict}`);
    }

    console.log(`\n✅ 判定完了: ${Object.keys(results).length} 件`);
  }
}

main();
