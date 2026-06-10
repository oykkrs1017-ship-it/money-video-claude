import { describe, it, expect } from 'vitest';
import { formatEpisodeId, parseEpisodeId, isEpisodeId } from './id';
import { DomainError } from './errors';

describe('formatEpisodeId', () => {
  it('pads single digit to 3 digits', () => {
    expect(formatEpisodeId(7)).toBe('ep007');
  });

  it('pads double digit to 3 digits', () => {
    expect(formatEpisodeId(42)).toBe('ep042');
  });

  it('keeps triple digit as-is', () => {
    expect(formatEpisodeId(123)).toBe('ep123');
  });

  it('allows 4+ digits without truncation', () => {
    expect(formatEpisodeId(1000)).toBe('ep1000');
  });

  it('rejects zero', () => {
    expect(() => formatEpisodeId(0)).toThrow(DomainError);
  });

  it('rejects negative numbers', () => {
    expect(() => formatEpisodeId(-1)).toThrow(DomainError);
  });

  it('rejects non-integers', () => {
    expect(() => formatEpisodeId(1.5)).toThrow(DomainError);
  });
});

describe('parseEpisodeId', () => {
  it('parses standard 3-digit format', () => {
    expect(parseEpisodeId('ep007')).toBe(7);
  });

  it('parses 4-digit format', () => {
    expect(parseEpisodeId('ep1000')).toBe(1000);
  });

  it('rejects 2-digit format', () => {
    expect(() => parseEpisodeId('ep99')).toThrow(DomainError);
  });

  it('rejects uppercase EP', () => {
    expect(() => parseEpisodeId('EP007')).toThrow(DomainError);
  });

  it('rejects missing prefix', () => {
    expect(() => parseEpisodeId('007')).toThrow(DomainError);
  });

  it('round-trips format → parse', () => {
    for (const n of [1, 7, 42, 100, 999, 1000]) {
      expect(parseEpisodeId(formatEpisodeId(n))).toBe(n);
    }
  });
});

describe('isEpisodeId', () => {
  it('accepts valid IDs', () => {
    expect(isEpisodeId('ep001')).toBe(true);
    expect(isEpisodeId('ep007')).toBe(true);
    expect(isEpisodeId('ep1000')).toBe(true);
  });

  it('rejects invalid IDs', () => {
    expect(isEpisodeId('EP001')).toBe(false);
    expect(isEpisodeId('ep99')).toBe(false);
    expect(isEpisodeId('episode001')).toBe(false);
    expect(isEpisodeId('')).toBe(false);
  });
});
