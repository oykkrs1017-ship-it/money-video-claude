import { describe, it, expect } from 'vitest';
import { loadEnv, envSchema } from './env';

describe('loadEnv', () => {
  it('returns defaults when all optional keys are absent', () => {
    const env = loadEnv({});
    expect(env.NODE_ENV).toBe('development');
    expect(env.LOG_LEVEL).toBe('info');
    expect(env.VOICEVOX_URL).toBe('http://localhost:50021');
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('parses production NODE_ENV', () => {
    const env = loadEnv({ NODE_ENV: 'production' });
    expect(env.NODE_ENV).toBe('production');
  });

  it('normalizes empty strings to undefined', () => {
    const env = loadEnv({ ANTHROPIC_API_KEY: '' });
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
  });

  it('preserves non-empty secrets', () => {
    const env = loadEnv({ ANTHROPIC_API_KEY: 'sk-xxx' });
    expect(env.ANTHROPIC_API_KEY).toBe('sk-xxx');
  });

  it('rejects invalid LOG_LEVEL', () => {
    expect(() => loadEnv({ LOG_LEVEL: 'verbose' })).toThrow();
  });

  it('rejects invalid VOICEVOX_URL', () => {
    expect(() => loadEnv({ VOICEVOX_URL: 'not-a-url' })).toThrow();
  });

  it('accepts custom VOICEVOX_URL', () => {
    const env = loadEnv({ VOICEVOX_URL: 'http://example.com:50021' });
    expect(env.VOICEVOX_URL).toBe('http://example.com:50021');
  });
});

describe('envSchema', () => {
  it('exports the raw zod schema for composition', () => {
    expect(envSchema.safeParse({}).success).toBe(true);
  });
});
