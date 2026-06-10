/**
 * エピソード ID 生成・正規化
 *
 * プロジェクト規約:
 *   - 表示形式: `ep001`, `ep007`, `ep123` (小文字 `ep` + 3桁以上のゼロ埋め)
 *   - 3桁未満: 不正。4桁以上: そのまま通す（ep1000 などの将来拡張に備える）
 */

import { DomainError } from './errors';

const EPISODE_ID_REGEX = /^ep(\d{3,})$/;
const MIN_ORDINAL = 1;

/**
 * 番号から Episode ID 文字列を生成する。
 * 例) 7 → "ep007", 123 → "ep123", 1000 → "ep1000"
 */
export function formatEpisodeId(ordinal: number): string {
  if (!Number.isInteger(ordinal) || ordinal < MIN_ORDINAL) {
    throw new DomainError(
      `Invalid episode ordinal: ${ordinal} (must be a positive integer >= ${MIN_ORDINAL})`,
    );
  }
  return `ep${String(ordinal).padStart(3, '0')}`;
}

/**
 * Episode ID 文字列から番号を取り出す。
 * 例) "ep007" → 7, "ep1000" → 1000
 */
export function parseEpisodeId(id: string): number {
  const match = EPISODE_ID_REGEX.exec(id);
  if (!match) {
    throw new DomainError(`Invalid episode ID format: "${id}" (expected /^ep\\d{3,}$/)`);
  }
  const ordinal = Number.parseInt(match[1]!, 10);
  if (!Number.isFinite(ordinal) || ordinal < MIN_ORDINAL) {
    throw new DomainError(`Invalid episode ordinal parsed from "${id}": ${ordinal}`);
  }
  return ordinal;
}

/**
 * 文字列が Episode ID 形式かを判定する型ガード。
 */
export function isEpisodeId(value: string): boolean {
  return EPISODE_ID_REGEX.test(value);
}
