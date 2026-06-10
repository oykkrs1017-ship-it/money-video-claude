/**
 * normalizeForVoicevox のユニットテスト
 *
 * 各ルール単独の置換に加え、順序依存（km/nm を m より先）を検証する。
 */

import { describe, expect, it } from 'vitest';
import { DEFAULT_RULES, normalizeForVoicevox } from './textNormalizer';

describe('normalizeForVoicevox', () => {
  describe('単位記号の置換', () => {
    it('km を「キロメートル」に置換する', () => {
      expect(normalizeForVoicevox('距離は42km')).toBe('距離は42キロメートル');
    });

    it('nm を「ナノメートル」に置換する', () => {
      expect(normalizeForVoicevox('3nmプロセス')).toBe('3ナノメートルプロセス');
    });

    it('独立した m を「メートル」に置換する', () => {
      expect(normalizeForVoicevox('高さ100m')).toBe('高さ100メートル');
    });

    it('m の直後が英字の場合は置換しない（例: 100ms は対象外）', () => {
      // 'm' の直後が 's' なので (?![a-zA-Zぁ-ん]) で弾かれる
      expect(normalizeForVoicevox('100ms')).toBe('100ms');
    });

    it('m の直後がひらがなの場合は置換しない', () => {
      expect(normalizeForVoicevox('100mもの')).toBe('100mもの');
    });

    it('% を「パーセント」に置換する', () => {
      expect(normalizeForVoicevox('20%成長')).toBe('20パーセント成長');
    });

    it('小数値の % も置換する', () => {
      expect(normalizeForVoicevox('3.14%')).toBe('3.14パーセント');
    });

    it('$B を「億ドル」に置換する（大文字・小文字）', () => {
      expect(normalizeForVoicevox('$5B規模')).toBe('5億ドル規模');
      expect(normalizeForVoicevox('$5b規模')).toBe('5億ドル規模');
    });

    it('$T を「兆ドル」に置換する（大文字・小文字）', () => {
      expect(normalizeForVoicevox('$2T市場')).toBe('2兆ドル市場');
      expect(normalizeForVoicevox('$2t市場')).toBe('2兆ドル市場');
    });
  });

  describe('順序依存', () => {
    it('km は m より先に処理される（42km が 42キロメートル になる）', () => {
      // 仮に m を先に処理していたら "42メートルキロメートル" になってしまう
      expect(normalizeForVoicevox('42km')).toBe('42キロメートル');
    });

    it('nm は m より先に処理される', () => {
      expect(normalizeForVoicevox('3nm')).toBe('3ナノメートル');
    });
  });

  describe('非置換ケース', () => {
    it('マッチしないテキストはそのまま返す', () => {
      const input = 'こんにちは、世界';
      expect(normalizeForVoicevox(input)).toBe(input);
    });

    it('空文字はそのまま返す', () => {
      expect(normalizeForVoicevox('')).toBe('');
    });
  });

  describe('複合パターン', () => {
    it('複数の単位が混在しても全て置換する', () => {
      const input = '5nmプロセス、100km走、20%成長、$2T市場';
      const expected = '5ナノメートルプロセス、100キロメートル走、20パーセント成長、2兆ドル市場';
      expect(normalizeForVoicevox(input)).toBe(expected);
    });
  });

  describe('ルール上書き', () => {
    it('カスタムルールのみを適用できる', () => {
      const custom = [{ name: 'exclaim', pattern: /!/g, replacement: '、' }];
      expect(normalizeForVoicevox('Hello!', custom)).toBe('Hello、');
    });

    it('空配列を渡すと一切置換されない', () => {
      expect(normalizeForVoicevox('42km', [])).toBe('42km');
    });

    it('DEFAULT_RULES は readonly（凍結相当）として取り扱う', () => {
      // 型レベルで ReadonlyArray なので push はコンパイルエラーだが、
      // ここでは実体が配列であることのみ確認する
      expect(Array.isArray(DEFAULT_RULES)).toBe(true);
      expect(DEFAULT_RULES.length).toBeGreaterThan(0);
    });
  });
});
