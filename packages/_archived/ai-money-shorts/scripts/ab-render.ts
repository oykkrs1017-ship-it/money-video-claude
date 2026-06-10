/**
 * scripts/ab-render.ts
 * A/B テスト用レンダラー — 同一エピソードを 2 種類のテンプレートで同時レンダリングし、
 * brain/scorecards/{episodeId}_typeA.json / _typeB.json にスコアカードを記録する。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/ab-render.ts --episode ep001 --type-a TypeA-Mystery --type-b TypeC-Versus
 *   npx ts-node --transpile-only scripts/ab-render.ts --episode ep001  # TypeA/B をランダム選択
 *
 * 出力:
 *   out/{episodeId}_TypeA-Mystery.mp4
 *   out/{episodeId}_TypeC-Versus.mp4
 *   brain/scorecards/{episodeId}_TypeA-Mystery.json  (verdict: PENDING, templateType 記録済み)
 *   brain/scorecards/{episodeId}_TypeC-Versus.json
 */

import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { Episode, CompositionType } from '../src/types/episode';
import { getCompositionId, getAllTypes } from '../src/utils/templateSelector';

dotenv.config();

// ─── 設定 ────────────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..', '..', '..');
const EPISODES_DIR = path.join(__dirname, '..', 'src', 'data', 'episodes');
const OUTPUT_DIR = path.join(__dirname, '..', 'out');
const SCORECARDS_DIR = path.join(ROOT_DIR, 'brain', 'scorecards');

// ─── CLI 引数 ─────────────────────────────────────────────────────────────────
function parseArgs(): { episodeId: string; typeA: CompositionType; typeB: CompositionType } {
  const args = process.argv.slice(2);

  let episodeId = '';
  let typeAArg = '';
  let typeBArg = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) episodeId = args[i + 1];
    if (args[i] === '--type-a' && args[i + 1]) typeAArg = args[i + 1];
    if (args[i] === '--type-b' && args[i + 1]) typeBArg = args[i + 1];
  }

  if (!episodeId) {
    console.error('使い方: ts-node scripts/ab-render.ts --episode <episodeId> [--type-a TypeA-Mystery --type-b TypeC-Versus]');
    process.exit(1);
  }

  // ランダム選択（重複なし）
  const allTypes = getAllTypes();
  if (!typeAArg || !typeBArg) {
    const shuffled = [...allTypes].sort(() => Math.random() - 0.5);
    typeAArg = typeAArg || shuffled[0];
    typeBArg = typeBArg || shuffled[1];
  }

  const validTypes = new Set(allTypes);
  if (!validTypes.has(typeAArg as CompositionType)) {
    console.error(`❌ 無効なテンプレート type-a: ${typeAArg}`);
    console.error(`   有効値: ${allTypes.join(', ')}`);
    process.exit(1);
  }
  if (!validTypes.has(typeBArg as CompositionType)) {
    console.error(`❌ 無効なテンプレート type-b: ${typeBArg}`);
    console.error(`   有効値: ${allTypes.join(', ')}`);
    process.exit(1);
  }
  if (typeAArg === typeBArg) {
    console.error('❌ type-a と type-b は異なるテンプレートを指定してください');
    process.exit(1);
  }

  return {
    episodeId,
    typeA: typeAArg as CompositionType,
    typeB: typeBArg as CompositionType,
  };
}

// ─── レンダリング ─────────────────────────────────────────────────────────────

async function renderVariant(
  bundled: string,
  episode: Episode,
  compositionType: CompositionType,
  outputPath: string,
): Promise<number> {
  const compositionId = getCompositionId(compositionType);
  const episodeWithType: Episode = { ...episode, compositionType };

  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: { episode: episodeWithType },
  });

  const durationSec = composition.durationInFrames / 30;
  console.log(`  📐 ${compositionType}: ${composition.durationInFrames}f (${durationSec.toFixed(1)}s)`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: { episode: episodeWithType },
    imageFormat: 'jpeg',
    crf: 18,
    onProgress: ({ progress }: { progress: number }) => {
      const pct = Math.round(progress * 100);
      process.stdout.write(`\r  [${compositionType}] ${pct}%`);
    },
  });
  process.stdout.write('\n');

  return durationSec;
}

// ─── スコアカード保存 ─────────────────────────────────────────────────────────

interface AbScorecard {
  episodeId: string;
  channel: string;
  recordedAt: string;
  directiveHash: string | null;
  hypothesisId: string | null;
  templateType: string;
  abVariant: 'A' | 'B';
  outputPath: string;
  production: {
    renderDurationSec: number;
    templateType: string;
  };
  verdict: 'PENDING';
  lessonIds: string[];
}

function saveAbScorecard(card: AbScorecard): void {
  fs.mkdirSync(SCORECARDS_DIR, { recursive: true });
  const cardPath = path.join(SCORECARDS_DIR, `${card.episodeId}_${card.templateType}.json`);
  fs.writeFileSync(cardPath, JSON.stringify(card, null, 2), 'utf8');
  console.log(`  📊 スコアカード: brain/scorecards/${card.episodeId}_${card.templateType}.json`);
}

// ─── results.tsv 追記 ─────────────────────────────────────────────────────────

function appendResultsTsv(card: AbScorecard): void {
  const tsvPath = path.join(ROOT_DIR, 'brain', 'results.tsv');

  // ヘッダー行が存在しない場合は作成
  if (!fs.existsSync(tsvPath)) {
    fs.mkdirSync(path.dirname(tsvPath), { recursive: true });
    fs.writeFileSync(
      tsvPath,
      'ep_id\tdate\tchannel\thypothesis_id\tseed\ttemplate\treview_loops\tcost_usd\tretention_rate\tctr\tviews_7d\tverdict\n',
      'utf8',
    );
  }

  const row = [
    `${card.episodeId}_${card.templateType}`,
    new Date().toISOString().slice(0, 10),
    card.channel,
    card.hypothesisId ?? 'null',
    'null',
    card.templateType,
    '0',
    '0.00',
    'PENDING', 'PENDING', 'PENDING', 'PENDING',
  ].join('\t');

  fs.appendFileSync(tsvPath, row + '\n', 'utf8');
}

// ─── メイン ───────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { episodeId, typeA, typeB } = parseArgs();

  const episodePath = path.join(EPISODES_DIR, `${episodeId}.json`);
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ エピソードファイルが見つかりません: ${episodePath}`);
    process.exit(1);
  }

  const episode: Episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));

  // directive.yaml からハッシュを取得（任意）
  const directiveYamlPath = path.join(ROOT_DIR, 'knowledge', 'directive.yaml');
  const directiveHash = fs.existsSync(directiveYamlPath)
    ? crypto.createHash('sha256').update(fs.readFileSync(directiveYamlPath)).digest('hex').slice(0, 12)
    : null;

  console.log(`\n🎬 A/B レンダリング開始: ${episodeId}`);
  console.log(`   TypeA → ${typeA}`);
  console.log(`   TypeB → ${typeB}`);
  console.log(`   エピソード: ${episode.title}\n`);

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // バンドルは一度だけ
  console.log('📦 バンドル中...');
  const entryPoint = path.join(__dirname, '../src/index.ts');
  const bundled = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  // TypeA レンダリング
  console.log(`\n▶ Variant A: ${typeA}`);
  const outputA = path.join(OUTPUT_DIR, `${episodeId}_${typeA}.mp4`);
  const durationA = await renderVariant(bundled, episode, typeA, outputA);
  console.log(`  ✅ → ${outputA}`);

  // TypeB レンダリング
  console.log(`\n▶ Variant B: ${typeB}`);
  const outputB = path.join(OUTPUT_DIR, `${episodeId}_${typeB}.mp4`);
  const durationB = await renderVariant(bundled, episode, typeB, outputB);
  console.log(`  ✅ → ${outputB}`);

  // スコアカード保存
  const now = new Date().toISOString();
  const baseCard = {
    episodeId,
    channel: 'ai-money-shorts',
    recordedAt: now,
    directiveHash,
    hypothesisId: null,
    verdict: 'PENDING' as const,
    lessonIds: [],
  };

  const cardA: AbScorecard = {
    ...baseCard,
    templateType: typeA,
    abVariant: 'A',
    outputPath: outputA,
    production: { renderDurationSec: durationA, templateType: typeA },
  };
  const cardB: AbScorecard = {
    ...baseCard,
    templateType: typeB,
    abVariant: 'B',
    outputPath: outputB,
    production: { renderDurationSec: durationB, templateType: typeB },
  };

  saveAbScorecard(cardA);
  saveAbScorecard(cardB);
  appendResultsTsv(cardA);
  appendResultsTsv(cardB);

  console.log(`\n✅ A/B レンダリング完了`);
  console.log(`\n次のステップ:`);
  console.log(`  1. 両動画を確認してから YouTube アップロード`);
  console.log(`     npm run upload -- --episode ${episodeId}_${typeA}`);
  console.log(`     npm run upload -- --episode ${episodeId}_${typeB}`);
  console.log(`  2. 7日後に Analytics 収集`);
  console.log(`     npm run collect-analytics -- --all`);
  console.log(`  3. KEEP/DISCARD 判定`);
  console.log(`     npm run verdict`);
}

main().catch((err) => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
