import { describe, it, expect } from 'vitest';
import { DomainError, AdapterError, MoneyVideoError, getErrorMessage } from './errors';

describe('DomainError', () => {
  it('has kind "DomainError"', () => {
    const err = new DomainError('invariant violated');
    expect(err.kind).toBe('DomainError');
  });

  it('is an instance of MoneyVideoError and Error', () => {
    const err = new DomainError('x');
    expect(err).toBeInstanceOf(MoneyVideoError);
    expect(err).toBeInstanceOf(Error);
  });

  it('preserves the cause chain', () => {
    const cause = new Error('root cause');
    const err = new DomainError('wrapped', cause);
    expect(err.cause).toBe(cause);
  });

  it('name equals class name', () => {
    const err = new DomainError('x');
    expect(err.name).toBe('DomainError');
  });
});

describe('AdapterError', () => {
  it('carries adapter name', () => {
    const err = new AdapterError('timeout', 'voicevox');
    expect(err.adapterName).toBe('voicevox');
    expect(err.kind).toBe('AdapterError');
  });

  it('is distinguishable from DomainError via kind', () => {
    const domain = new DomainError('x');
    const adapter = new AdapterError('y', 'z');
    // TypeScript narrowing friendly
    const errs: MoneyVideoError[] = [domain, adapter];
    const adapters = errs.filter((e) => e.kind === 'AdapterError');
    expect(adapters).toHaveLength(1);
    expect(adapters[0]).toBe(adapter);
  });
});

describe('getErrorMessage', () => {
  it('extracts message from Error', () => {
    expect(getErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns string as-is', () => {
    expect(getErrorMessage('string err')).toBe('string err');
  });

  it('JSON-stringifies unknown objects', () => {
    expect(getErrorMessage({ code: 42 })).toBe('{"code":42}');
  });

  it('falls back to "Unknown error" for circular refs', () => {
    const circ: { self?: unknown } = {};
    circ.self = circ;
    expect(getErrorMessage(circ)).toBe('Unknown error');
  });
});
