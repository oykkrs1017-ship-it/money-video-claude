/**
 * scripts/lib/run-script.ts
 *
 * サブスクリプト・外部バイナリの同期実行ヘルパー。
 * spawnSync + 配列引数を使用してシェルインジェクションを回避する。
 * preview-slides.ts の実績パターンを標準化したもの。
 */

import { spawnSync } from 'child_process';
import * as path from 'path';

const isWin = process.platform === 'win32';

function binPath(cwd: string, name: string): string {
  return path.join(cwd, 'node_modules', '.bin', isWin ? `${name}.cmd` : name);
}

/**
 * ts-node --transpile-only でサブスクリプトを同期実行する。
 * 失敗（exit code != 0）時は Error をスロー。
 */
export function runScript(
  scriptPath: string,
  extraArgs: string[] = [],
  options?: { cwd?: string },
): void {
  const cwd = options?.cwd ?? path.resolve('.');
  const bin = binPath(cwd, 'ts-node');
  const result = spawnSync(bin, ['--transpile-only', scriptPath, ...extraArgs], {
    stdio: 'inherit',
    cwd,
    shell: isWin,
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(
      `${path.basename(scriptPath)} が失敗しました (exit ${result.status ?? 'unknown'})`,
    );
  }
}

/**
 * remotion render を同期実行する。
 * 失敗（exit code != 0）時は Error をスロー。
 */
export function runRemotionRender(args: string[], options?: { cwd?: string }): void {
  const cwd = options?.cwd ?? path.resolve('.');
  const bin = binPath(cwd, 'remotion');
  const result = spawnSync(bin, ['render', ...args], {
    stdio: 'inherit',
    cwd,
    shell: isWin,
  });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`remotion render が失敗しました (exit ${result.status ?? 'unknown'})`);
  }
}
