import * as fs from 'fs';
import * as path from 'path';
import { ScriptInput } from './types';

/**
 * script-input.json を読み込んでパースする
 */
export function parseScriptInput(filePath: string): ScriptInput {
  const absolutePath = path.resolve(filePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`script-input.json が見つかりません: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf-8');
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(`JSON パースエラー: ${(e as Error).message}`);
  }

  return validateScriptInput(parsed);
}

/**
 * パースしたオブジェクトのバリデーション
 */
function validateScriptInput(data: unknown): ScriptInput {
  if (typeof data !== 'object' || data === null) {
    throw new Error('script-input.json のルートはオブジェクトである必要があります');
  }

  const d = data as Record<string, unknown>;

  if (typeof d.videoId !== 'string') throw new Error('videoId は文字列である必要があります');
  if (typeof d.seed !== 'string') throw new Error('seed は文字列である必要があります');
  if (typeof d.title !== 'string') throw new Error('title は文字列である必要があります');
  if (!Array.isArray(d.chapters)) throw new Error('chapters は配列である必要があります');

  return data as ScriptInput;
}
