/**
 * scripts/pipeline/steps.ts
 * generate.ts のパイプラインを宣言的ステップ集合として定義する。
 *
 * 各ステップの run() は既存スクリプトをそのまま呼ぶだけ（挙動は変えない）。
 * スキップ判定・manifest 記録は runner.ts が担う。
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fail, type PipelineStep } from './runner';
import { GenerateVoiceUseCase } from '@money-video/usecases/generateVoice';
import { makeVoiceDeps } from '../lib/useCaseDeps';

/** 音声生成の既定値（旧 generate-voices.ts と同値） */
const FPS = 30;
const BUFFER_FRAMES = 5;
const VOICES_DIR_RELATIVE = 'voices';

// ─────────────────────────────────────────────
// サブスクリプト実行 / VOICEVOX チェック
// ─────────────────────────────────────────────

/** ts-node でサブスクリプトを同期実行し、失敗時は即終了 */
export function runScript(scriptPath: string, extraArgs: string[] = []): void {
  const quotedArgs = extraArgs.map((a) => (a.includes(' ') ? `"${a}"` : a)).join(' ');
  const cmd = `npx ts-node --transpile-only ${scriptPath} ${quotedArgs}`.trimEnd();
  try {
    execSync(cmd, { stdio: 'inherit', cwd: path.resolve('.') });
  } catch {
    fail(`${path.basename(scriptPath)} が失敗しました`);
  }
}

export function checkVoicevox(): Promise<boolean> {
  return new Promise((resolve) => {
    const http = require('http') as typeof import('http');
    const req = http.get('http://localhost:50021/version', (res) => {
      resolve((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300);
      res.resume();
    });
    req.on('error', () => resolve(false));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// ─────────────────────────────────────────────
// パイプライン定義
// ─────────────────────────────────────────────

export interface PipelineContext {
  yamlAbs: string;
  jsonPath: string;
  outputJson: string | null;
  scriptInputPath: string;
  propsOutPath: string;
  briefOutPath: string;
  mp4Path: string;
}

export interface PipelineFlags {
  skipImages: boolean;
  skipInfographics: boolean;
  render: boolean;
}

/**
 * generate.ts のステップ DAG を構築する。
 * 順序: yaml→json → images → infographics → voices(enrich) → props-copy → thumbnail-brief → [render]
 * skipImages / skipInfographics 指定時は該当ステップを DAG から除外する（従来挙動を維持）。
 */
export function buildSteps(ctx: PipelineContext, flags: PipelineFlags): PipelineStep[] {
  const steps: PipelineStep[] = [];

  // Step 1: YAML → JSON 変換
  steps.push({
    name: 'yaml-to-json',
    title: 'YAML → JSON 変換',
    inputs: [ctx.yamlAbs],
    outputs: [ctx.jsonPath],
    run: () => {
      const args = [ctx.yamlAbs];
      if (ctx.outputJson) args.push('-o', ctx.outputJson);
      runScript('scripts/yaml-to-json.ts', args);
      if (!fs.existsSync(ctx.jsonPath)) {
        fail(`JSON 変換後のファイルが見つかりません: ${ctx.jsonPath}`);
      }
    },
  });

  // Step 2: 画像ダウンロード（動的出力のため outputs 空 → 入力ハッシュ一致でスキップ）
  if (!flags.skipImages) {
    steps.push({
      name: 'images',
      title: '画像ダウンロード',
      inputs: [ctx.jsonPath],
      outputs: [],
      run: () => runScript('scripts/fetch-images.ts', ['--input', ctx.jsonPath]),
    });
  }

  // Step 3: インフォグラフィック生成 (Canvas)
  if (!flags.skipInfographics) {
    steps.push({
      name: 'infographics',
      title: 'インフォグラフィック生成 (Canvas)',
      inputs: [ctx.jsonPath],
      outputs: [],
      run: () => runScript('scripts/generate-infographics.ts', ['--input', ctx.jsonPath]),
    });
  }

  // Step 4: 音声生成（VOICEVOX + content hash キャッシュで冪等）。
  // 入力 JSON を in-place で frameCount 付与するため、run 後のハッシュ記録により
  // YAML 未変更（=yaml-to-json スキップで frameCount 温存）なら次回スキップされる。
  // execSync generate-voices.ts ではなく GenerateVoiceUseCase を直接呼ぶことで
  // エラーが型付きスタックトレースとして伝播する。
  steps.push({
    name: 'voices',
    title: '音声生成 (VOICEVOX)',
    inputs: [ctx.jsonPath],
    outputs: [],
    run: async () => {
      const useCase = new GenerateVoiceUseCase(makeVoiceDeps());
      await useCase.execute({
        inputPath: ctx.jsonPath,
        voicesDirRelative: VOICES_DIR_RELATIVE,
        fps: FPS,
        bufferFrames: BUFFER_FRAMES,
      });
    },
  });

  // Step 5: Remotion props を script-input.json と output/ にコピー
  steps.push({
    name: 'props-copy',
    title: 'Props JSON → output/ へコピー',
    inputs: [ctx.jsonPath],
    outputs: [ctx.scriptInputPath, ctx.propsOutPath],
    run: () => {
      fs.copyFileSync(ctx.jsonPath, ctx.scriptInputPath);
      fs.copyFileSync(ctx.jsonPath, ctx.propsOutPath);
    },
  });

  // Step 6: サムネイルブリーフ生成
  steps.push({
    name: 'thumbnail-brief',
    title: 'サムネイルブリーフ生成',
    inputs: [ctx.propsOutPath],
    outputs: [ctx.briefOutPath],
    run: () =>
      runScript('scripts/generate-thumbnail-brief.ts', [ctx.propsOutPath, '-o', ctx.briefOutPath]),
  });

  // Step 7: MP4 レンダリング（--render 時のみ）
  if (flags.render) {
    steps.push({
      name: 'render',
      title: 'MP4 レンダリング',
      inputs: [ctx.propsOutPath],
      outputs: [ctx.mp4Path],
      run: () => {
        const cmd = `npx remotion render src/index.ts MainVideo --props "${ctx.propsOutPath}" --output "${ctx.mp4Path}"`;
        try {
          execSync(cmd, { stdio: 'inherit', cwd: path.resolve('.') });
        } catch {
          fail('remotion render が失敗しました');
        }
      },
    });
  }

  return steps;
}
