/**
 * 構造化ロガー（Phase 1 skeleton）
 *
 * Phase 1 では pino を採用する前段階として、stdout に JSON Lines を書く
 * 軽量実装にとどめる。インターフェース (`Logger`) は pino 互換の最小 API
 * を持ち、Phase 2 で `pino()` に差し替えても呼び出し側は変更不要。
 */

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LEVEL_RANK: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export interface LoggerOptions {
  name: string;
  level?: LogLevel;
  /** 追加でペイロードに常時付与する構造化データ（例: episodeId） */
  base?: Record<string, unknown>;
}

export interface Logger {
  readonly name: string;
  readonly level: LogLevel;
  trace(payload: Record<string, unknown> | string, msg?: string): void;
  debug(payload: Record<string, unknown> | string, msg?: string): void;
  info(payload: Record<string, unknown> | string, msg?: string): void;
  warn(payload: Record<string, unknown> | string, msg?: string): void;
  error(payload: Record<string, unknown> | string, msg?: string): void;
  fatal(payload: Record<string, unknown> | string, msg?: string): void;
  child(bindings: Record<string, unknown>): Logger;
}

function normalizePayload(
  payload: Record<string, unknown> | string,
  msg?: string,
): { fields: Record<string, unknown>; message: string | undefined } {
  if (typeof payload === 'string') {
    return { fields: {}, message: payload };
  }
  return { fields: payload, message: msg };
}

/**
 * LoggerOptions から Logger を生成する。
 * `stdout` に 1行 = 1 JSON レコードで出力し、collector が取りこぼさない形式にする。
 */
export function createLogger(opts: LoggerOptions): Logger {
  const name = opts.name;
  const level: LogLevel = opts.level ?? 'info';
  const base = opts.base ?? {};
  const threshold = LEVEL_RANK[level];

  const emit = (lvl: LogLevel, payload: Record<string, unknown> | string, msg?: string): void => {
    if (LEVEL_RANK[lvl] < threshold) return;
    const { fields, message } = normalizePayload(payload, msg);
    const record = {
      time: Date.now(),
      level: lvl,
      name,
      ...base,
      ...fields,
      ...(message !== undefined ? { msg: message } : {}),
    };
    // 意図的な stdout 書き出し（構造化ログ）。console.log ではなく process.stdout.write を使う。
    process.stdout.write(`${JSON.stringify(record)}\n`);
  };

  const logger: Logger = {
    name,
    level,
    trace: (payload, msg) => emit('trace', payload, msg),
    debug: (payload, msg) => emit('debug', payload, msg),
    info: (payload, msg) => emit('info', payload, msg),
    warn: (payload, msg) => emit('warn', payload, msg),
    error: (payload, msg) => emit('error', payload, msg),
    fatal: (payload, msg) => emit('fatal', payload, msg),
    child: (bindings) => createLogger({ name, level, base: { ...base, ...bindings } }),
  };

  return logger;
}
