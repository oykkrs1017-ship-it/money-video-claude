import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLogger } from './logger';

describe('createLogger', () => {
  let captured: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  beforeEach(() => {
    captured = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (process.stdout.write as any) = (chunk: unknown) => {
      captured.push(String(chunk));
      return true;
    };
  });

  afterEach(() => {
    process.stdout.write = originalWrite;
  });

  function lastRecord(): Record<string, unknown> {
    const line = captured[captured.length - 1]!;
    return JSON.parse(line.trim());
  }

  it('emits JSON per line with name and level', () => {
    const log = createLogger({ name: 'test' });
    log.info({ userId: 42 }, 'hello');
    const rec = lastRecord();
    expect(rec.name).toBe('test');
    expect(rec.level).toBe('info');
    expect(rec.userId).toBe(42);
    expect(rec.msg).toBe('hello');
    expect(typeof rec.time).toBe('number');
  });

  it('supports string-only shorthand', () => {
    const log = createLogger({ name: 'test' });
    log.warn('quick warning');
    expect(lastRecord().msg).toBe('quick warning');
    expect(lastRecord().level).toBe('warn');
  });

  it('filters by level threshold', () => {
    const log = createLogger({ name: 'test', level: 'warn' });
    log.debug('silenced');
    log.info('silenced');
    log.warn('kept');
    expect(captured).toHaveLength(1);
    expect(lastRecord().msg).toBe('kept');
  });

  it('child() merges base bindings', () => {
    const root = createLogger({ name: 'root', base: { service: 'pipeline' } });
    const child = root.child({ episodeId: 'ep007' });
    child.info('x');
    const rec = lastRecord();
    expect(rec.service).toBe('pipeline');
    expect(rec.episodeId).toBe('ep007');
    expect(rec.name).toBe('root');
  });

  it('child() inherits level threshold', () => {
    const root = createLogger({ name: 'root', level: 'error' });
    const child = root.child({ traceId: 'abc' });
    child.info('silenced');
    child.error('kept');
    expect(captured).toHaveLength(1);
    expect(lastRecord().msg).toBe('kept');
  });

  it('all 6 levels resolve correctly', () => {
    const log = createLogger({ name: 'test', level: 'trace' });
    log.trace('t');
    log.debug('d');
    log.info('i');
    log.warn('w');
    log.error('e');
    log.fatal('f');
    expect(captured).toHaveLength(6);
    const levels = captured.map((l) => (JSON.parse(l.trim()) as { level: string }).level);
    expect(levels).toEqual(['trace', 'debug', 'info', 'warn', 'error', 'fatal']);
  });
});
