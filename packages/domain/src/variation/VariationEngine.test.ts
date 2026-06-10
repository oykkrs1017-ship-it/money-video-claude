import { describe, expect, it } from 'vitest';
import { getVariation } from './VariationEngine';
import { hashSeed, pick } from './hash';

describe('hashSeed', () => {
  it('is deterministic for the same seed', () => {
    expect(hashSeed('ep007')).toBe(hashSeed('ep007'));
  });

  it('produces different hashes for different seeds', () => {
    expect(hashSeed('ep007')).not.toBe(hashSeed('ep008'));
  });

  it('produces unsigned 32-bit integer', () => {
    const hash = hashSeed('anything');
    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('pick', () => {
  it('throws on empty array', () => {
    expect(() => pick([], 0, 0)).toThrow();
  });

  it('selects items deterministically', () => {
    const arr = ['a', 'b', 'c', 'd'];
    const hash = hashSeed('ep007');
    expect(pick(arr, hash, 0)).toBe(pick(arr, hash, 0));
  });
});

describe('getVariation', () => {
  it('returns news-white theme (news channel fixed)', () => {
    const config = getVariation('ep007');
    expect(config.theme).toBe('news-white');
  });

  it('pairs news themes with news-gradient background', () => {
    const config = getVariation('ep007');
    expect(config.background).toBe('news-gradient');
  });

  it('is deterministic: same seed yields identical config', () => {
    expect(getVariation('ep007')).toEqual(getVariation('ep007'));
  });

  it('yields different titleStyle for different seeds (non-exhaustive)', () => {
    const seeds = ['ep001', 'ep003', 'ep005', 'ep006', 'ep007'];
    const titleStyles = new Set(seeds.map((s) => getVariation(s).titleStyle));
    expect(titleStyles.size).toBeGreaterThan(1);
  });
});
