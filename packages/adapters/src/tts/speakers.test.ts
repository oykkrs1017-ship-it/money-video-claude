/**
 * resolveSpeakerId のユニットテスト
 */

import { describe, expect, it } from 'vitest';
import { DomainError } from '@money-video/shared-ts';
import {
  DEFAULT_SPEAKER_IDS,
  FALLBACK_SPEAKER_ID,
  resolveSpeakerId,
} from './speakers';

describe('resolveSpeakerId', () => {
  it('maro を 3 に解決する（デフォルト）', () => {
    expect(resolveSpeakerId('maro')).toBe(3);
  });

  it('ponchan を 2 に解決する（デフォルト）', () => {
    expect(resolveSpeakerId('ponchan')).toBe(2);
  });

  it('DEFAULT_SPEAKER_IDS と整合する', () => {
    expect(DEFAULT_SPEAKER_IDS.maro).toBe(3);
    expect(DEFAULT_SPEAKER_IDS.ponchan).toBe(2);
  });

  describe('未登録スピーカー', () => {
    it('非 strict モードでは FALLBACK_SPEAKER_ID を返す', () => {
      expect(resolveSpeakerId('unknown-speaker')).toBe(FALLBACK_SPEAKER_ID);
      expect(FALLBACK_SPEAKER_ID).toBe(3);
    });

    it('strict モードでは DomainError を投げる', () => {
      expect(() => resolveSpeakerId('unknown-speaker', DEFAULT_SPEAKER_IDS, true)).toThrow(
        DomainError,
      );
      expect(() => resolveSpeakerId('unknown-speaker', DEFAULT_SPEAKER_IDS, true)).toThrow(
        /Unknown speaker/,
      );
    });
  });

  describe('マッピング上書き', () => {
    it('カスタムマッピングでスピーカー ID を差し替えられる', () => {
      const custom = { maro: 99, ponchan: 100 };
      expect(resolveSpeakerId('maro', custom)).toBe(99);
      expect(resolveSpeakerId('ponchan', custom)).toBe(100);
    });

    it('カスタムマッピングに存在しないスピーカーは FALLBACK に落ちる', () => {
      const custom = { maro: 99 };
      expect(resolveSpeakerId('ponchan', custom)).toBe(FALLBACK_SPEAKER_ID);
    });
  });
});
