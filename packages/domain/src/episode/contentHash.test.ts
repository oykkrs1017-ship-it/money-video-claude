import { describe, expect, it } from 'vitest';
import { lineContentHash } from './contentHash';

describe('lineContentHash', () => {
  it('同じ speakerId とテキストには同じハッシュを返す（決定論的）', () => {
    expect(lineContentHash(3, 'こんにちは')).toBe(lineContentHash(3, 'こんにちは'));
  });

  it('speakerId が違えば異なるハッシュ', () => {
    expect(lineContentHash(3, 'こんにちは')).not.toBe(lineContentHash(2, 'こんにちは'));
  });

  it('テキストが違えば異なるハッシュ', () => {
    expect(lineContentHash(3, 'こんにちは')).not.toBe(lineContentHash(3, 'こんばんは'));
  });

  it('16桁の16進文字列を返す（ファイル名として安全）', () => {
    expect(lineContentHash(3, 'テスト')).toMatch(/^[0-9a-f]{16}$/);
  });
});
