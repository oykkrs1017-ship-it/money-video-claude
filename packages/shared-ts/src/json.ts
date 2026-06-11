import * as fs from 'fs';
import { type ZodSchema } from 'zod';

/**
 * JSON ファイルを読み込み、Zod スキーマで検証して返す。
 * 検証失敗時は読み込みエラー / バリデーションエラーを Error としてスローする。
 *
 * @example
 *   const topic = readJsonValidated(p, NextTopicSchema);
 */
export function readJsonValidated<T>(filePath: string, schema: ZodSchema<T>): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `JSON パースエラー: ${filePath}\n${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`JSON バリデーションエラー: ${filePath}\n${issues}`);
  }
  return result.data;
}
