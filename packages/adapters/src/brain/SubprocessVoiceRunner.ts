/**
 * SubprocessVoiceRunner
 *
 * yaml-to-json.ts → generate-voices.ts をサブプロセスで順番に実行する。
 * VoiceRunner ポートを実装。
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { createLogger } from '@money-video/shared-ts';

const logger = createLogger({ name: 'SubprocessVoiceRunner', level: 'info' });

/** VoiceRunner port と shape 互換 */
export interface VoiceRunner {
  run(epId: string, dryRun: boolean): Promise<{ success: boolean; output: string }>;
}

export class SubprocessVoiceRunner implements VoiceRunner {
  private readonly scriptsDir: string;
  private readonly packageDir: string;
  private readonly inputDir: string;

  constructor(scriptsDir: string, packageDir: string) {
    this.scriptsDir = scriptsDir;
    this.packageDir = packageDir;
    this.inputDir = path.join(packageDir, 'input');
  }

  async run(epId: string, dryRun: boolean): Promise<{ success: boolean; output: string }> {
    if (dryRun) {
      logger.info({ epId }, '[DRY-RUN] 音声合成スキップ');
      return { success: true, output: '' };
    }

    const yamlPath = path.join(this.inputDir, `${epId}.yaml`);
    if (!fs.existsSync(yamlPath)) {
      logger.warn({ epId, yamlPath }, 'YAML ファイルが見つかりません');
      return { success: false, output: `YAML not found: ${yamlPath}` };
    }

    // ─── Step 1: yaml-to-json.ts ────────────────────────────────────────────
    const yamlToJsonResult = this.runScript('yaml-to-json.ts', []);
    if (!yamlToJsonResult.success) {
      logger.warn({ epId, preview: yamlToJsonResult.output.slice(0, 300) }, 'yaml-to-json 失敗');
      return yamlToJsonResult;
    }

    const jsonPath = path.join(this.inputDir, `${epId}.json`);
    if (!fs.existsSync(jsonPath)) {
      logger.warn({ epId, jsonPath }, 'JSON ファイルが生成されませんでした');
      return { success: false, output: `JSON not found after yaml-to-json: ${jsonPath}` };
    }

    // ─── Step 2: generate-voices.ts ─────────────────────────────────────────
    logger.info({ epId }, '音声合成開始');
    const voiceResult = this.runScript('generate-voices.ts', ['--input', jsonPath]);

    if (!voiceResult.success) {
      logger.warn({ epId, preview: voiceResult.output.slice(0, 300) }, '音声合成失敗');
    } else {
      logger.info({ epId }, '音声合成成功');
    }

    return voiceResult;
  }

  private runScript(script: string, args: string[]): { success: boolean; output: string } {
    const scriptPath = path.join(this.scriptsDir, script);
    const result = spawnSync(
      'npx',
      ['ts-node', '--transpile-only', scriptPath, ...args],
      {
        encoding: 'utf8',
        cwd: this.packageDir,
        timeout: 5 * 60 * 1000,
      },
    );
    return {
      success: result.status === 0,
      output: (result.stdout ?? '') + (result.stderr ?? ''),
    };
  }
}
