/**
 * scripts/update-patterns.ts
 * episode-analytics.json + brain/results.tsv を読み込み、
 * knowledge/winning-patterns.json の titlePatterns を更新する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/update-patterns.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '..');

interface EpisodeAnalytics {
  epId: string;
  videoId: string;
  title: string;
  titlePatternType: 'why_academic' | 'paradox' | 'number_impact' | 'other' | 'unknown';
  uploadedAt: string;
  analyticsReadyAt: string;
  ctr: number | null;
  retentionRate: number | null;
  views7d: number | null;
  verdict: string;
}

interface AnalyticsStore {
  schemaVersion: string;
  updatedAt: string;
  episodes: EpisodeAnalytics[];
}

function parseTsv(filePath: string): Record<string, Record<string, string>> {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').trim().split('\n');
  if (lines.length < 2) return {};
  const headers = lines[0].split('\t');
  const result: Record<string, Record<string, string>> = {};
  for (const line of lines.slice(1)) {
    const cols = line.split('\t');
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ''; });
    if (row['ep_id']) result[row['ep_id']] = row;
  }
  return result;
}

function average(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function main() {
  const analyticsPath = path.join(ROOT, 'knowledge', 'episode-analytics.json');
  const tsvPath = path.join(ROOT, 'brain', 'results.tsv');
  const winningPath = path.join(ROOT, 'knowledge', 'winning-patterns.json');

  if (!fs.existsSync(analyticsPath)) {
    console.error('❌ knowledge/episode-analytics.json が見つかりません');
    process.exit(1);
  }

  const store: AnalyticsStore = JSON.parse(fs.readFileSync(analyticsPath, 'utf8'));
  const tsvData = parseTsv(tsvPath);

  // results.tsv のデータで episode-analytics を補完
  let updated = false;
  for (const ep of store.episodes) {
    const row = tsvData[ep.epId];
    if (!row) continue;
    const ctr = parseFloat(row['ctr']);
    const retention = parseFloat(row['retention_rate']);
    const views = parseInt(row['views_7d'], 10);
    if (!isNaN(ctr) && ctr > 0 && ep.ctr !== ctr) {
      ep.ctr = ctr;
      updated = true;
    }
    if (!isNaN(retention) && retention > 0 && ep.retentionRate !== retention) {
      ep.retentionRate = retention;
      updated = true;
    }
    if (!isNaN(views) && views > 0 && ep.views7d !== views) {
      ep.views7d = views;
      updated = true;
    }
    if (row['verdict'] && row['verdict'] !== 'PENDING' && ep.verdict !== row['verdict']) {
      ep.verdict = row['verdict'];
      updated = true;
    }
  }

  if (updated) {
    store.updatedAt = new Date().toISOString();
    fs.writeFileSync(analyticsPath, JSON.stringify(store, null, 2), 'utf8');
    console.log('✅ episode-analytics.json を results.tsv で補完しました');
  }

  // タイトルパターン別集計（CTRデータがあるもののみ）
  const measured = store.episodes.filter(e => e.ctr !== null && e.ctr > 0);
  if (measured.length === 0) {
    console.log('ℹ️  CTRデータがまだありません。collect-analytics.ts を実行してください。');
    return;
  }

  const patternGroups: Record<string, EpisodeAnalytics[]> = {
    why_academic: [],
    paradox: [],
    number_impact: [],
    other: [],
  };
  for (const ep of measured) {
    const group = patternGroups[ep.titlePatternType] ?? patternGroups['other'];
    group.push(ep);
  }

  const titlePatterns = Object.entries(patternGroups)
    .filter(([, eps]) => eps.length > 0)
    .map(([type, eps]) => ({
      type,
      sampleCount: eps.length,
      avgCtr: Math.round(average(eps.map(e => e.ctr!)) * 100) / 100,
      avgRetentionRate: Math.round(average(eps.filter(e => e.retentionRate !== null).map(e => e.retentionRate!)) * 10) / 10,
      avgViews7d: Math.round(average(eps.filter(e => e.views7d !== null).map(e => e.views7d!))),
      topEpisodes: eps
        .sort((a, b) => (b.ctr ?? 0) - (a.ctr ?? 0))
        .slice(0, 3)
        .map(e => ({ epId: e.epId, title: e.title, ctr: e.ctr, views7d: e.views7d })),
    }))
    .sort((a, b) => b.avgCtr - a.avgCtr);

  // winning-patterns.json を更新
  const winning = JSON.parse(fs.readFileSync(winningPath, 'utf8'));
  winning.titlePatterns = titlePatterns;
  winning.selfChannelUpdatedAt = new Date().toISOString();
  fs.writeFileSync(winningPath, JSON.stringify(winning, null, 2), 'utf8');

  console.log('\n✅ winning-patterns.json の titlePatterns を更新しました');
  console.log('\nタイトルパターン別CTR:');
  for (const p of titlePatterns) {
    console.log(`  ${p.type}: CTR ${p.avgCtr}% / 保持率 ${p.avgRetentionRate}% / 7日視聴 ${p.avgViews7d}回 (n=${p.sampleCount})`);
  }
}

main();
