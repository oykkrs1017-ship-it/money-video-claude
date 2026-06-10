/**
 * YouTube タグのサニタイズ（純粋関数）
 *
 * 原典: scripts/upload-youtube.ts:uploadVideo 内のインラインロジック
 *
 * YouTube タグ制約:
 *   - 特殊文字（& < > " '）を除去
 *   - 1タグ 30 文字以内
 *   - タグ全体の合計バイト数が 500 バイト以内（カンマ区切り込み）
 */

const MAX_TAG_CHARS = 30;
const MAX_TOTAL_BYTES = 500;
// YouTube 検索アルゴリズムはタグが多すぎると重みが分散する。
// 30 個を上限にすることでコアテーマへの重み集中を促す。
const MAX_TAG_COUNT = 30;
const SPECIAL_CHARS_RE = /[&<>"']/g;

/**
 * raw な tags 配列を YouTube の制約に合わせてサニタイズする。
 *
 * @param rawTags - 元のタグ配列（undefined / null も受け付ける）
 * @returns 制約を満たした文字列配列
 */
export function sanitizeTags(rawTags: ReadonlyArray<string> | undefined | null): string[] {
  if (!rawTags || rawTags.length === 0) return [];

  // 1. 特殊文字を除去し、30文字超・空文字・重複を弾く
  const seen = new Set<string>();
  const cleaned: string[] = [];
  for (const raw of rawTags) {
    const t = raw.replace(SPECIAL_CHARS_RE, '').trim();
    if (t.length === 0 || t.length > MAX_TAG_CHARS) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    cleaned.push(t);
  }

  // 2. 件数 30 以内 かつ 合計バイト数 500 以内 を両方満たすまで先頭から積み上げる
  const result: string[] = [];
  let totalBytes = 0;
  for (const tag of cleaned) {
    if (result.length >= MAX_TAG_COUNT) break;
    const bytes = Buffer.byteLength(tag, 'utf8');
    const sepBytes = result.length > 0 ? 1 : 0;
    if (totalBytes + sepBytes + bytes > MAX_TOTAL_BYTES) break;
    result.push(tag);
    totalBytes += sepBytes + bytes;
  }
  return result;
}
