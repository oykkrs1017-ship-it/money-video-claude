/**
 * FileSystemScriptStore
 *
 * script-input.json を読み書きする ScriptStore の具象実装。
 * 現行 scripts/generate-voices.ts の挙動（JSON.parse / writeFileSync）と完全互換。
 *
 * 注: Phase 2 終盤で YAML 主入力（episodes/ep007/spec.yaml）に切り替える予定だが、
 * Phase 2 前半は既存 JSON 入出力との後方互換を優先する。
 */

import * as fs from 'fs';
import type { ScriptInput } from '@money-video/domain';
import { AdapterError } from '@money-video/shared-ts';

export class FileSystemScriptStore {
  async load(inputPath: string): Promise<ScriptInput> {
    try {
      const raw = await fs.promises.readFile(inputPath, 'utf-8');
      return JSON.parse(raw) as ScriptInput;
    } catch (err) {
      throw new AdapterError(
        `Failed to load script input at ${inputPath}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  async save(inputPath: string, data: ScriptInput): Promise<void> {
    try {
      const pretty = `${JSON.stringify(data, null, 2)}\n`;
      await fs.promises.writeFile(inputPath, pretty, 'utf-8');
    } catch (err) {
      throw new AdapterError(
        `Failed to save script input to ${inputPath}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }
}
