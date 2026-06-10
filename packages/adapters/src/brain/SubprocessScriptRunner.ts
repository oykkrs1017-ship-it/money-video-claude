/**
 * SubprocessScriptRunner
 *
 * generate-script.ts を ts-node サブプロセスで実行する。
 * ScriptRunner ポートを実装。
 */

import * as path from 'path';
import { spawnSync } from 'child_process';
import { createLogger } from '@money-video/shared-ts';

const logger = createLogger({ name: 'SubprocessScriptRunner', level: 'info' });

/** ScriptRunner port と shape 互換 */
export interface ScriptRunner {
  run(
    topic: string,
    epId: string,
    dryRun: boolean,
  ): Promise<{ success: boolean; output: string }>;
}

export class SubprocessScriptRunner implements ScriptRunner {
  private readonly scriptsDir: string;
  private readonly packageDir: string;

  /**
   * @param scriptsDir  scripts/ ディレクトリの絶対パス
   * @param packageDir  パッケージルート（cwd として使用）
   */
  constructor(scriptsDir: string, packageDir: string) {
    this.scriptsDir = scriptsDir;
    this.packageDir = packageDir;
  }

  async run(
    topic: string,
    epId: string,
    dryRun: boolean,
  ): Promise<{ success: boolean; output: string }> {
    if (dryRun) {
      logger.info({ topic, epId }, '[DRY-RUN] 台本生成スキップ');
      return { success: true, output: '' };
    }

    const scriptPath = path.join(this.scriptsDir, 'generate-script.ts');

    logger.info({ topic, epId }, '台本生成開始');

    const result = spawnSync(
      'npx',
      ['ts-node', '--transpile-only', scriptPath, '--topic', topic, '--ep', epId],
      {
        encoding: 'utf8',
        cwd: this.packageDir,
        timeout: 5 * 60 * 1000,
      },
    );

    const output = (result.stdout ?? '') + (result.stderr ?? '');
    const success = result.status === 0;

    if (!success) {
      logger.warn({ topic, epId, preview: output.slice(0, 300) }, '台本生成失敗');
    } else {
      logger.info({ topic, epId }, '台本生成成功');
    }

    return { success, output };
  }
}
