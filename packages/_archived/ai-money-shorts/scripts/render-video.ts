/**
 * render-video.ts
 * episode.json を読み込んで Remotion で MP4 をレンダリングする
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/render-video.ts --episode <episodeId>
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { bundle } from '@remotion/bundler';
import { renderMedia, selectComposition } from '@remotion/renderer';
import { Episode } from '../src/types/episode';
import { getCompositionId } from '../src/utils/templateSelector';

dotenv.config({ path: path.resolve(__dirname, '../../../.env'), override: true });

function parseArgs(): { episodeId: string } {
  const args = process.argv.slice(2);
  let episodeId = '';
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--episode' && args[i + 1]) episodeId = args[i + 1];
  }
  if (!episodeId) {
    console.error('使い方: ts-node scripts/render-video.ts --episode <episodeId>');
    process.exit(1);
  }
  return { episodeId };
}

async function main(): Promise<void> {
  const { episodeId } = parseArgs();

  const episodePath = path.join(__dirname, '../src/data/episodes', `${episodeId}.json`);
  if (!fs.existsSync(episodePath)) {
    console.error(`❌ エピソードファイルが見つかりません: ${episodePath}`);
    process.exit(1);
  }

  const episode: Episode = JSON.parse(fs.readFileSync(episodePath, 'utf-8'));
  const compositionId = getCompositionId(episode.compositionType);

  const outputDir = process.env.OUTPUT_DIR ?? path.join(__dirname, '../out');
  fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${episodeId}.mp4`);

  console.log(`🎬 レンダリング開始: ${episodeId}`);
  console.log(`📐 コンポジション: ${compositionId}`);
  console.log(`📁 出力先: ${outputPath}`);

  // Remotion バンドル
  console.log('\n📦 バンドル中...');
  const entryPoint = path.join(__dirname, '../src/index.ts');
  const bundled = await bundle({
    entryPoint,
    webpackOverride: (config) => config,
  });

  // コンポジション選択
  const composition = await selectComposition({
    serveUrl: bundled,
    id: compositionId,
    inputProps: { episode },
  });

  console.log(`⏱️  動画長: ${composition.durationInFrames}フレーム (${(composition.durationInFrames / 30).toFixed(1)}秒)`);

  // レンダリング
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: { episode },
    imageFormat: 'jpeg',
    crf: 18,
    onProgress: ({ progress }: { progress: number }) => {
      const percent = Math.round(progress * 100);
      const filled = Math.floor(percent / 5);
      const bar = '█'.repeat(filled) + '░'.repeat(20 - filled);
      process.stdout.write(`\r  [${bar}] ${percent}%`);
    },
  });

  console.log('\n\n✅ レンダリング完了!');
  console.log(`📁 出力ファイル: ${outputPath}`);

  const stats = fs.statSync(outputPath);
  const sizeMB = (stats.size / 1024 / 1024).toFixed(1);
  console.log(`📦 ファイルサイズ: ${sizeMB}MB`);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error('\n❌ レンダリングエラー:', message);
  process.exit(1);
});
