/**
 * エラー階層
 *
 * 「ドメイン不変条件違反」と「外部 I/O 失敗」を層で区別する。
 * - DomainError: validation・契約違反・純粋関数内の論理エラー
 * - AdapterError: HTTP / fs / API SDK の失敗
 *
 * CLI / usecase 層はこの 2 種類だけを catch し、それ以外は再 throw する。
 */

/** money-video 全体の共通基底エラー */
export abstract class MoneyVideoError extends Error {
  /** 種別タグ。never 条件分岐に使える判別子。 */
  abstract readonly kind: string;

  constructor(
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
    // V8 環境のスタックトレース保持
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, new.target);
    }
  }
}

/** ドメイン層のエラー（契約違反・検証失敗など） */
export class DomainError extends MoneyVideoError {
  readonly kind = 'DomainError' as const;
}

/** アダプタ層のエラー（外部依存の失敗） */
export class AdapterError extends MoneyVideoError {
  readonly kind = 'AdapterError' as const;

  constructor(
    message: string,
    /** どのアダプタで発生したか（例: 'voicevox', 'anthropic', 'youtube'） */
    public readonly adapterName: string,
    cause?: unknown,
  ) {
    super(message, cause);
  }
}

/** unknown な catch 値から安全にメッセージを取り出す。 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return 'Unknown error';
  }
}
