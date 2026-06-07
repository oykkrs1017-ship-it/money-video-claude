/**
 * scripts/generate.ts
 * YAML スクリプトから動画制作まで全工程を一括実行するパイプラインオーケストレーター。
 *
 * 宣言的 DAG（scripts/pipeline/）に委譲し、入力未変更ステップは自動スキップする。
 * 各ステップの実体・順序は scripts/pipeline/steps.ts、実行エンジンは runner.ts を参照。
 *
 * 使い方:
 *   npx ts-node scripts/generate.ts input/ep003.yaml
 *   npx ts-node scripts/generate.ts input/ep003.yaml --skip-voices
 *   npx ts-node scripts/generate.ts input/ep003.yaml --render
 *
 * オプション:
 *   --skip-images         画像ダウンロードをスキップ
 *   --skip-infographics   Canvas インフォグラフィック生成をスキップ
 *   --skip-voices         VOICEVOX 起動確認をスキップ（キャッシュから音声情報を復元）
 *   --no-studio           完了後の Studio 起動をスキップ
 *   --render              Studio の代わりに MP4 をフルレンダリング
 *   -o <path>             出力 JSON パス（省略時: input/<videoId>.json）
 */

import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  BOLD,
  CYAN,
  GREEN,
  RESET,
  YELLOW,
  fail,
  ok,
  runPipeline,
} from './pipeline/runner';
import { buildSteps, checkVoicevox, type PipelineContext } from './pipeline/steps';

// ─────────────────────────────────────────────
// CLI 引数パース
// ─────────────────────────────────────────────

interface CliOptions {
  yamlPath: string;
  outputJson: string | null;
  skipImages: boolean;
  skipInfographics: boolean;
  skipVoices: boolean;
  noStudio: boolean;
  render: boolean;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
使い方:
  npx ts-node scripts/generate.ts <input.yaml> [オプション]

オプション:
  --skip-images         画像ダウンロードをスキップ
  --skip-infographics   Canvas インフォグラフィック生成をスキップ
  --skip-voices         VOICEVOX 起動確認をスキップ（キャッシュから音声情報を復元）
  --no-studio           完了後の Remotion Studio 起動をスキップ
  --render              Studio の代わりに MP4 をフルレンダリング
  -o <path>             出力 JSON パス（省略時: input/<videoId>.json）
  -h, --help            このヘルプを表示

例:
  npx ts-node scripts/generate.ts input/ep003.yaml
  npx ts-node scripts/generate.ts input/ep003.yaml --skip-voices
  npx ts-node scripts/generate.ts input/ep003.yaml --render --no-studio
`);
    process.exit(0);
  }

  const yamlPath = args[0]!;
  let outputJson: string | null = null;
  let skipImages = false;
  let skipInfographics = false;
  let skipVoices = false;
  let noStudio = false;
  let render = false;

  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--skip-images') skipImages = true;
    else if (args[i] === '--skip-infographics') skipInfographics = true;
    else if (args[i] === '--skip-voices') skipVoices = true;
    else if (args[i] === '--no-studio') noStudio = true;
    else if (args[i] === '--render') render = true;
    else if (args[i] === '-o' && args[i + 1]) {
      outputJson = args[i + 1]!;
      i++;
    }
  }

  return { yamlPath, outputJson, skipImages, skipInfographics, skipVoices, noStudio, render };
}

/** YAML / -o から videoId を確定する（yaml-to-json 実行前でも決まる） */
function resolveVideoId(yamlAbs: string, outputJson: string | null): string {
  if (outputJson) return path.basename(outputJson, '.json');
  const yamlText = fs.readFileSync(yamlAbs, 'utf-8');
  const m = yamlText.match(/videoId\s*:\s*['"]?([^\s'"]+)['"]?/);
  return m?.[1] ?? path.basename(yamlAbs, '.yaml');
}

// ─────────────────────────────────────────────
// メイン
// ─────────────────────────────────────────────

async function main() {
  const opts = parseArgs();

  const yamlAbs = path.resolve(opts.yamlPath);
  if (!fs.existsSync(yamlAbs)) {
    fail(`YAML ファイルが見つかりません: ${yamlAbs}`);
  }

  // パス類を yaml-to-json 実行前に確定する
  const videoId = resolveVideoId(yamlAbs, opts.outputJson);
  const jsonPath = opts.outputJson
    ? path.resolve(opts.outputJson)
    : path.join(path.dirname(yamlAbs), `${videoId}.json`);

  if (!fs.existsSync('output')) {
    fs.mkdirSync('output', { recursive: true });
  }

  const ctx: PipelineContext = {
    yamlAbs,
    jsonPath,
    outputJson: opts.outputJson,
    scriptInputPath: path.resolve('input/script-input.json'),
    propsOutPath: path.resolve(`output/${videoId}_props.json`),
    briefOutPath: path.resolve(`output/${videoId}_thumbnail-brief.md`),
    mp4Path: path.resolve(`output/${videoId}.mp4`),
  };

  console.log(`\n${BOLD}🎬 動画生成パイプライン開始${RESET}`);
  console.log(`   入力: ${yamlAbs}`);

  // VOICEVOX 起動確認（--skip-voices でない場合は従来どおり必須）
  if (opts.skipVoices) {
    console.log(
      `${YELLOW}⏭  --skip-voices: VOICEVOX 起動確認をスキップし、キャッシュから音声情報を復元します${RESET}`,
    );
  } else {
    const voicevoxOk = await checkVoicevox();
    if (!voicevoxOk) {
      console.log(`${YELLOW}⚠️  VOICEVOX が応答しません (http://localhost:50021)${RESET}`);
      console.log(`   VOICEVOX を起動してから再実行するか、--skip-voices を指定してください。`);
      fail('VOICEVOX 未起動');
    }
  }

  // 宣言的パイプライン実行（入力未変更ステップは自動スキップ）
  const steps = buildSteps(ctx, {
    skipImages: opts.skipImages,
    skipInfographics: opts.skipInfographics,
    render: opts.render,
  });
  const manifestPath = path.resolve(`cache/build-manifest.${videoId}.json`);
  await runPipeline(steps, manifestPath);

  ok(`script-input.json 更新: ${ctx.scriptInputPath}`);
  ok(`Props: ${ctx.propsOutPath}`);
  ok(`サムネイルブリーフ: ${ctx.briefOutPath}`);

  // 最終ステップ: Studio 起動 / 完了メッセージ（render は DAG 内で実行済み）
  if (opts.render) {
    ok(`MP4 完成: ${ctx.mp4Path}`);
  } else if (!opts.noStudio) {
    console.log(`\n${BOLD}${CYAN}━━━ Remotion Studio 起動 ━━━${RESET}`);
    console.log(`   URL: ${CYAN}http://localhost:3001/MainVideo${RESET}`);
    console.log(`   ${YELLOW}Ctrl+C で終了${RESET}\n`);

    const studio = spawn('npx', ['remotion', 'studio', 'src/index.ts'], {
      stdio: 'inherit',
      shell: true,
      cwd: path.resolve('.'),
    });

    studio.on('close', (code) => {
      console.log(`\nStudio 終了 (code: ${code})`);
    });

    process.on('SIGINT', () => {
      studio.kill('SIGINT');
      process.exit(0);
    });
  } else {
    console.log(`\n${BOLD}${GREEN}✨ 全ステップ完了！${RESET}`);
    console.log(`   次のコマンドで Studio を起動できます:`);
    console.log(`   ${CYAN}npx remotion studio src/index.ts${RESET}\n`);
  }
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
