/**
 * scripts/render-shorts.ts
 *
 * ShortsVideo コンポジション（1080x1920, hook チャプターのみ）をレンダリングする。
 *
 * 使い方:
 *   npx ts-node --transpile-only scripts/render-shorts.ts --ep ep007
 *   npx ts-node --transpile-only scripts/render-shorts.ts --ep ep007 --props output/ep007.props.json
 *
 * 出力: output/{epId}_shorts.mp4
 *
 * 前提:
 *   - input/script-input.json が対象エピソードの内容になっていること
 *     （generate-voices.ts 実行後に自動更新される）
 *   - 音声 WAV が public/voices/ に存在すること
 */

import * as path from 'path';
import * as fs from 'fs';
import { runRemotionRender } from './lib/run-script';

interface Args {
  epId: string;
  propsFile?: string;
}

function parseArgs(argv: string[]): Args {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 && argv[i + 1] ? argv[i + 1] : undefined;
  };
  const epId = get('--ep');
  if (!epId) {
    process.stderr.write('使い方: npx ts-node --transpile-only scripts/render-shorts.ts --ep <epId> [--props <propsFile>]\n');
    process.exit(1);
  }
  return { epId, propsFile: get('--props') };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const packageRoot = path.resolve(__dirname, '..');
  const outputFile = path.join(packageRoot, 'output', `${args.epId}_shorts.mp4`);

  // props ファイルが指定された場合、script-input.json に上書きコピー
  if (args.propsFile) {
    const src = path.resolve(args.propsFile);
    const dest = path.join(packageRoot, 'input', 'script-input.json');
    if (!fs.existsSync(src)) {
      process.stderr.write(`❌ props ファイルが見つかりません: ${src}\n`);
      process.exit(1);
    }
    if (src !== dest) {
      fs.copyFileSync(src, dest);
      process.stdout.write(`[render-shorts] props を script-input.json にコピーしました\n`);
    }
  }

  process.stdout.write(`[render-shorts] ShortsVideo レンダリング開始 → ${outputFile}\n`);

  runRemotionRender(['ShortsVideo', outputFile], { cwd: packageRoot });

  process.stdout.write(`[render-shorts] 完了: ${outputFile}\n`);
}

main();
