/**
 * scripts/generate-video.ts
 * 一気通貫パイプライン
 * 使い方: npx ts-node scripts/generate-video.ts --input ./input/script-input.json
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ---- VariationEngine (インライン実装: Node.js から import しやすいよう独立) ----
type ThemeType = 'midnight-blue' | 'forest-green' | 'warm-sunset' | 'arctic-white' | 'crimson-dark';
type TitleStyleType = 'slide-left' | 'fade-scale' | 'typewriter' | 'glitch' | 'split-reveal';
type CharacterLayoutType = 'left-right' | 'bottom-center' | 'picture-in-picture' | 'alternating';
type SubtitleStyleType = 'bottom-bar' | 'floating' | 'highlight-word' | 'cinematic';
type TransitionType = 'fade' | 'slide' | 'zoom' | 'wipe' | 'dissolve';
type BackgroundType = 'gradient' | 'particles' | 'grid' | 'wave' | 'geometric';

interface VariationConfig {
  theme: ThemeType; titleStyle: TitleStyleType; characterLayout: CharacterLayoutType;
  subtitleStyle: SubtitleStyleType; transition: TransitionType; background: BackgroundType;
}

const THEMES: ThemeType[] = ['midnight-blue', 'forest-green', 'warm-sunset', 'arctic-white', 'crimson-dark'];
const TITLE_STYLES: TitleStyleType[] = ['slide-left', 'fade-scale', 'typewriter', 'glitch', 'split-reveal'];
const CHARACTER_LAYOUTS: CharacterLayoutType[] = ['left-right', 'bottom-center', 'picture-in-picture', 'alternating'];
const SUBTITLE_STYLES: SubtitleStyleType[] = ['bottom-bar', 'floating', 'highlight-word', 'cinematic'];
const TRANSITIONS: TransitionType[] = ['fade', 'slide', 'zoom', 'wipe', 'dissolve'];
const BACKGROUNDS: BackgroundType[] = ['gradient', 'particles', 'grid', 'wave', 'geometric'];

function hashSeed(seed: string): number {
  let hash = 5381;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) + hash) ^ seed.charCodeAt(i);
    hash = hash >>> 0;
  }
  return hash;
}

function pick<T>(arr: T[], hash: number, offset: number): T {
  return arr[Math.abs((hash + offset * 2654435769) >>> 0) % arr.length];
}

function getVariation(seed: string): VariationConfig {
  const hash = hashSeed(seed);
  return {
    theme:           pick(THEMES,            hash, 0),
    titleStyle:      pick(TITLE_STYLES,      hash, 1),
    characterLayout: pick(CHARACTER_LAYOUTS, hash, 2),
    subtitleStyle:   pick(SUBTITLE_STYLES,   hash, 3),
    transition:      pick(TRANSITIONS,       hash, 4),
    background:      pick(BACKGROUNDS,       hash, 5),
  };
}

// ---- ユーティリティ ----
function run(cmd: string, label: string) {
  console.log(`\n▶ ${label}`);
  console.log(`  $ ${cmd}`);
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.resolve('.') });
  } catch (e) {
    console.error(`❌ "${label}" が失敗しました`);
    throw e;
  }
}

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
    run(
      `npx ts-node scripts/generate-voices.ts --input "${inputPath}"`,
      'VOICEVOX 音声合成'
    );
  }

  // 5. output ディレクトリ作成
  const outputDir = path.resolve('output');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${videoId}.mp4`);

  // 6. Remotion レンダリング
  // MainVideo コンポジションに scriptInput を props として渡す
  const propsPath = path.join(outputDir, `${videoId}_props.json`);
  fs.writeFileSync(propsPath, JSON.stringify({ scriptInput }), 'utf-8');

  run(
    `npx remotion render src/index.ts MainVideo "${outputPath}" --props="${propsPath}"`,
    'Remotion レンダリング'
  );

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
