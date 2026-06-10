/**
 * sanitizeTags のユニットテスト
 */

import { describe, expect, it } from 'vitest';
import { sanitizeTags } from './tagSanitizer';

describe('sanitizeTags', () => {
  it('null / undefined / 空配列 は空配列を返す', () => {
    expect(sanitizeTags(null)).toEqual([]);
    expect(sanitizeTags(undefined)).toEqual([]);
    expect(sanitizeTags([])).toEqual([]);
  });

  it('特殊文字（& < > " \'）を除去する', () => {
    expect(sanitizeTags(['AI&半導体', '<NVIDIA>', 'it\'s', '"quoted"'])).toEqual([
      'AI半導体',
      'NVIDIA',
      'its',
      'quoted',
    ]);
  });

  it('30 文字を超えるタグは除外する', () => {
    const long = 'あ'.repeat(31); // 31 文字
    const ok = 'あ'.repeat(30);   // 30 文字
    const result = sanitizeTags([long, ok]);
    expect(result).toEqual([ok]);
  });

  it('空になったタグは除外する', () => {
    // 特殊文字だけのタグは除去後に空になる
    expect(sanitizeTags(['&<>"\'', 'ok'])).toEqual(['ok']);
  });

  it('合計バイト数が 500 バイトを超えたら以降を捨てる', () => {
    // 各タグ 10 バイト（ASCII 10 文字）、50 タグで 500 バイト (+ 49 カンマ = 549) → 途中で切断
    const tags = Array.from({ length: 60 }, (_, i) => `tag${String(i).padStart(7, '0')}`); // 10 bytes each
    const result = sanitizeTags(tags);
    // 1 タグ目: 10 bytes (累計 10)
    // 2 タグ目: +1(,) +10 = 11 (累計 21)
    // ...
    // n タグ目: 累計 10 + (n-1)*11 <= 500 → n <= (500-10)/11 + 1 ≈ 45.5 → 45 タグ
    expect(result.length).toBeLessThan(60);
    expect(result.length).toBeGreaterThan(0);

    // 実際の合計バイト数が 500 以内であることを確認
    const total = result.join(',');
    expect(Buffer.byteLength(total, 'utf8')).toBeLessThanOrEqual(500);
  });

  it('先頭から順番に積み上げる（除外は末尾から）', () => {
    const tags = ['先頭', '中間', '末尾'];
    const result = sanitizeTags(tags);
    expect(result[0]).toBe('先頭');
  });

  it('普通のタグはそのまま通る', () => {
    const tags = ['NVIDIA', '半導体', 'AI投資', 'テクノロジー地政学'];
    const result = sanitizeTags(tags);
    expect(result).toEqual(tags);
  });

  it('前後の空白をトリムする', () => {
    expect(sanitizeTags(['  AI  ', ' 半導体 '])).toEqual(['AI', '半導体']);
  });

  it('件数は 30 個を上限とする（バイト余裕があっても超過分は捨てる）', () => {
    // 2 バイト ASCII タグを 50 個 → 30 個で止まる（500 バイトには到達しない）
    const tags = Array.from({ length: 50 }, (_, i) => `t${i}`);
    const result = sanitizeTags(tags);
    expect(result).toHaveLength(30);
    expect(result[0]).toBe('t0');
    expect(result[29]).toBe('t29');
  });

  it('重複タグは除外する', () => {
    expect(sanitizeTags(['AI', '半導体', 'AI', '半導体', 'TSMC'])).toEqual([
      'AI',
      '半導体',
      'TSMC',
    ]);
  });
});
