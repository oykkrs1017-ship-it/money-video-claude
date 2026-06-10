/**
 * build-episode.ts
 * episode.json の durationFrames を計算・検証してファイルを更新する
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/build-episode.ts --episode <episodeId>
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { Episode, DialogueLine } from '../src/types/episode';
import { FPS, TRANSITION_FRAMES, CTA_FRAMES, MAX_FRAMES, framesToTimeString } from '../src/utils/frameCalculator';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

function parseArgs(): { episodeId: string } {
  const args = process.argv.slice(2);
  let episodeId = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) episodeId = args[i + 1];
  }
  if (!episodeId) {
    console.error('使い方: ts-node scripts/build-episode.ts --episode <episodeId>');
    process.exit(1);
  }
  return { episodeId };
}

function loadEpisode(episodeId: string): Episode {
  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ エピソードファイルが見つかりません: ${episodePath}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(episodePath, 'utf-8')) as Episode;
}

function buildEpisode(episode: Episode): Episode {
  const allLines: DialogueLine[] = episode.sections.flatMap((s) => s.lines);

  // 全行の durationFrames が設定されているか確認
  const missingFrames = allLines.filter((l) => !l.durationFrames);
  if (missingFrames.length > 0) {
    console.warn(`⚠️ durationFrames が未設定の行が ${missingFrames.length} 件あります。デフォルト値(60)を使用します。`);
    missingFrames.forEach((l) => {
      l.durationFrames = 60;
    });
  }

  // 各セクションの合計フレームを計算
  let currentFrame = 0;
  episode.sections.forEach((section, si) => {
    section.lines.forEach((line) => {
      currentFrame += line.durationFrames!;
    });
    // セクション間トランジション（最後を除く）
    if (si < episode.sections.length - 1) {
      currentFrame += TRANSITION_FRAMES;
    }
  });

  const ctaFrames = CTA_FRAMES;
  const totalDurationFrames = currentFrame + ctaFrames;
  const totalDurationMs = Math.round((totalDurationFrames / FPS) * 1000);

  // 60秒超過チェック
  if (totalDurationFrames > MAX_FRAMES) {
    const excess = totalDurationFrames - MAX_FRAMES;
    const excessSec = (excess / FPS).toFixed(1);
    console.warn(`\n⚠️ 動画長が60秒を超えています (超過: ${excessSec}秒 = ${excess}フレーム)`);
    console.warn(`  現在: ${framesToTimeString(totalDurationFrames)} (${totalDurationFrames}フレーム)`);
    console.warn(`  目標: ${framesToTimeString(MAX_FRAMES)} (${MAX_FRAMES}フレーム)`);

    // 按分縮小の提案
    const dialogueFrames = totalDurationFrames - ctaFrames - (episode.sections.length - 1) * TRANSITION_FRAMES;
    const targetDialogueFrames = MAX_FRAMES - ctaFrames - (episode.sections.length - 1) * TRANSITION_FRAMES;
    const scaleFactor = targetDialogueFrames / dialogueFrames;
    console.warn(`  → 各セリフを ${(scaleFactor * 100).toFixed(0)}% に縮小すると60秒に収まります`);
  }

  const updatedEpisode: Episode = {
    ...episode,
    totalDurationFrames,
    totalDurationMs,
    sections: episode.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({ ...line })),
    })),
  };

  return updatedEpisode;
}

function printSummary(episode: Episode): void {
  const allLines = episode.sections.flatMap((s) => s.lines);
  const ponLines = allLines.filter((l) => l.character === 'pon').length;
  const maroLines = allLines.filter((l) => l.character === 'maro').length;

  console.log('\n📊 エピソードサマリー');
  console.log('─────────────────────────────');
  console.log(`🆔 ID: ${episode.id}`);
  console.log(`📌 トピック: ${episode.topic}`);
  console.log(`🎬 構成タイプ: ${episode.compositionType}`);
  console.log(`⏱️  総時間: ${framesToTimeString(episode.totalDurationFrames!)} (${episode.totalDurationFrames}フレーム)`);
  console.log(`💬 総セリフ数: ${allLines.length} (ポン先生: ${ponLines}, マロちゃん: ${maroLines})`);
  console.log('\n📑 セクション別時間配分:');
  episode.sections.forEach((section) => {
    const sectionFrames = section.lines.reduce((s, l) => s + (l.durationFrames ?? 0), 0);
    console.log(`  ${section.name}: ${framesToTimeString(sectionFrames)} (${sectionFrames}F)`);
  });
  console.log('\n🎭 使用表情:');
  const expressions = new Set(allLines.map((l) => `${l.character}:${l.expression}`));
  expressions.forEach((e) => console.log(`  ${e}`));
}

async function main(): Promise<void> {
  const { episodeId } = parseArgs();
  console.log(`🔨 エピソード構築中: ${episodeId}`);

  const episode = loadEpisode(episodeId);
  const updatedEpisode = buildEpisode(episode);

  // 保存
  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  fs.writeFileSync(episodePath, JSON.stringify(updatedEpisode, null, 2), 'utf-8');

  printSummary(updatedEpisode);
  console.log(`\n✅ episode.json 更新完了: ${episodePath}`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('❌ エラー:', message);
  process.exit(1);
});
