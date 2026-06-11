/**
 * scripts/generate-video.ts
 * 一気通貫パイプライン
 * 使い方: npx ts-node scripts/generate-video.ts --input ./input/script-input.json
 */
import * as fs from 'fs';
import * as path from 'path';
// Phase 1 rewire: VariationEngine は @money-video/domain に一本化。インライン実装を廃止。
import { getVariation } from '@money-video/domain';
import { runScript, runRemotionRender } from './lib/run-script';

// ---- メイン ----
async function main() {
  console.log('='.repeat(60));
  console.log('🎬 動画生成パイプライン 開始');
  console.log('='.repeat(60));

  // 1. 引数解析
  const args = process.argv.slice(2);
  const inputIdx = args.indexOf('--input');
  const inputPath = inputIdx >= 0 ? args[inputIdx + 1] : './input/script-input.json';
  const absInputPath = path.resolve(inputPath);

  if (!fs.existsSync(absInputPath)) {
    console.error(`❌ 入力ファイルが見つかりません: ${absInputPath}`);
    process.exit(1);
  }

  console.log(`\n📄 入力ファイル: ${absInputPath}`);

  // 2. script-input.json 読み込み
  const scriptInput = JSON.parse(fs.readFileSync(absInputPath, 'utf-8'));
  const { videoId, seed, title } = scriptInput;
  console.log(`\n📺 動画ID  : ${videoId}`);
  console.log(`📌 タイトル: ${title}`);

  // 3. VariationConfig 生成・表示
  const variation = getVariation(seed);
  console.log('\n🎨 VariationConfig (seed: ' + seed + ')');
  console.log(`  theme           : ${variation.theme}`);
  console.log(`  titleStyle      : ${variation.titleStyle}`);
  console.log(`  characterLayout : ${variation.characterLayout}`);
  console.log(`  subtitleStyle   : ${variation.subtitleStyle}`);
  console.log(`  transition      : ${variation.transition}`);
  console.log(`  background      : ${variation.background}`);

  // 4. VOICEVOX 音声合成
  const hasAudio = scriptInput.chapters.every((ch: any) =>
    ch.lines.every((l: any) => l.audioFile && fs.existsSync(path.resolve('public', l.audioFile)))
  );

  if (hasAudio) {
    console.log('\n⏭️  音声ファイルが既に存在するためスキップします（再生成する場合は public/voices/ を削除）');
  } else {
    console.log('\n▶ VOICEVOX 音声合成');
    runScript('scripts/generate-voices.ts', ['--input', inputPath]);
  }

  // 5. output ディレクトリ作成
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${videoId}.mp4`);

  // 6. Remotion レンダリング
  // MainVideo コンポジションに scriptInput を props として渡す
  const propsPath = path.join(outputDir, `${videoId}_props.json`);
  fs.writeFileSync(propsPath, JSON.stringify({ scriptInput }), 'utf-8');

  console.log('\n▶ Remotion レンダリング');
  runRemotionRender(['src/index.ts', 'MainVideo', outputPath, `--props=${propsPath}`]);

  // 7. 後片付け
  if (fs.existsSync(propsPath)) fs.unlinkSync(propsPath);

  console.log('\n' + '='.repeat(60));
  console.log(`✅ 完了！ → ${outputPath}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\n❌ パイプライン失敗:', err.message ?? err);
  process.exit(1);
});
