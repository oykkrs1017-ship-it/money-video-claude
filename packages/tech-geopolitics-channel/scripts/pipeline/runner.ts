/**
 * scripts/pipeline/runner.ts
 * 宣言的パイプライン実行エンジン。
 *
 * 各ステップを { name, inputs, outputs, run } で宣言し、入力ファイル群の内容ハッシュを
 * cache/build-manifest.{videoId}.json に記録する。次回実行時に「outputs が全て存在し、かつ
 * inputs の内容ハッシュが記録値と一致」するステップはスキップする。これにより手動ステップの
 * 抜け（旧タイトル混入・render 失敗）を構造で防ぎ、未変更ステップの再実行を避ける。
 *
 * 重要: manifest への記録は run() 実行「後」の inputs ハッシュで行う。voices のように
 * 入力 JSON を in-place で書き換える（frameCount を付与する）ステップでも、前回実行後の状態が
 * 今回の入力と一致すれば再実行不要、という正しい冪等判定になる。
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ─────────────────────────────────────────────
// 色付きログ（パイプライン共通）
// ─────────────────────────────────────────────

export const BOLD = '\x1b[1m';
export const GREEN = '\x1b[32m';
export const CYAN = '\x1b[36m';
export const YELLOW = '\x1b[33m';
export const RED = '\x1b[31m';
export const RESET = '\x1b[0m';

export function banner(step: number, total: number, title: string): void {
  console.log(`\n${BOLD}${CYAN}━━━ Step ${step}/${total}: ${title} ━━━${RESET}`);
}

export function ok(msg: string): void {
  console.log(`${GREEN}✅ ${msg}${RESET}`);
}

export function skip(msg: string): void {
  console.log(`${YELLOW}⏭  ${msg}${RESET}`);
}

export function fail(msg: string): never {
  console.error(`${RED}❌ ${msg}${RESET}`);
  process.exit(1);
}

// ─────────────────────────────────────────────
// ステップ定義
// ─────────────────────────────────────────────

export interface PipelineStep {
  /** manifest のキー（安定した識別子） */
  name: string;
  /** バナー表示用タイトル */
  title: string;
  /** 内容ハッシュ対象の入力ファイルパス（絶対パス推奨） */
  inputs: string[];
  /** 存在確認する出力ファイルパス。動的出力（PNG/WAV 群など）で静的に列挙できない場合は空配列にし、inputs ハッシュ一致のみでスキップ判定する */
  outputs: string[];
  /** ステップ本体。同期・非同期どちらも可 */
  run: () => void | Promise<void>;
  /** true なら常に実行（スキップ判定しない） */
  force?: boolean;
}

interface ManifestEntry {
  inputHash: string;
  ranAt: string;
}

type Manifest = Record<string, ManifestEntry>;

// ─────────────────────────────────────────────
// ハッシュ / manifest 入出力
// ─────────────────────────────────────────────

function fileHash(filePath: string): string {
  try {
    return crypto.createHash('sha1').update(fs.readFileSync(filePath)).digest('hex');
  } catch {
    // 存在しない/読めないファイルは 'missing' 扱い → ハッシュ不一致で必ず再実行される
    return 'missing';
  }
}

function inputsHash(inputs: string[]): string {
  return inputs.map((f) => `${path.basename(f)}:${fileHash(f)}`).join('|');
}

function loadManifest(manifestPath: string): Manifest {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Manifest;
  } catch {
    return {};
  }
}

function saveManifest(manifestPath: string, manifest: Manifest): void {
  const dir = path.dirname(manifestPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
}

function shouldSkip(step: PipelineStep, manifest: Manifest): boolean {
  if (step.force) return false;
  const rec = manifest[step.name];
  if (!rec) return false;
  // 出力ファイルが指定されている場合、1つでも欠けていれば再実行
  if (step.outputs.length > 0 && !step.outputs.every((o) => fs.existsSync(o))) return false;
  return rec.inputHash === inputsHash(step.inputs);
}

// ─────────────────────────────────────────────
// 実行
// ─────────────────────────────────────────────

export async function runPipeline(steps: PipelineStep[], manifestPath: string): Promise<void> {
  const manifest = loadManifest(manifestPath);
  const total = steps.length;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    banner(i + 1, total, step.title);

    if (shouldSkip(step, manifest)) {
      skip(`${step.title}: 入力未変更のためスキップ`);
      continue;
    }

    await step.run();

    // 実行後の入力状態でハッシュを記録（in-place 書き換えステップに対応）
    manifest[step.name] = {
      inputHash: inputsHash(step.inputs),
      ranAt: new Date().toISOString(),
    };
    saveManifest(manifestPath, manifest);

    ok(`${step.title} 完了`);
  }
}
