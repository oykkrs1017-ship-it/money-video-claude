/**
 * 環境変数スキーマ（Phase 1 skeleton）
 *
 * Phase 2 で `@t3-oss/env-core` に差し替え予定。今は zod でスキーマを定義し、
 * `loadEnv()` で `process.env` を検証するだけの最小実装にしておく。
 * これにより adapter 層が process.env を直読みする現状を、env 境界 1 箇所で
 * 吸収できる状態にする。
 */

import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  /** VOICEVOX エンジンのエンドポイント */
  VOICEVOX_URL: z.string().url().default('http://localhost:50021'),
  /** Anthropic API キー（台本生成で使用） */
  ANTHROPIC_API_KEY: z.string().optional(),
  /** Mapbox トークン（地図レンダリングで使用） */
  MAPBOX_TOKEN: z.string().optional(),
  /** YouTube OAuth 関連 */
  YOUTUBE_CLIENT_ID: z.string().optional(),
  YOUTUBE_CLIENT_SECRET: z.string().optional(),
  YOUTUBE_REFRESH_TOKEN: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * `process.env` を検証して型付き Env を返す。
 * 起動時に 1 度だけ呼ぶことを想定。検証失敗時は Zod エラーがそのまま投げられる。
 */
export function loadEnv(source: Record<string, string | undefined> = process.env): Env {
  // 空文字 → undefined に正規化。dotenv が "" を残すケースを安全側に倒す。
  const cleaned: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(source)) {
    cleaned[key] = value === '' ? undefined : value;
  }
  return envSchema.parse(cleaned);
}
