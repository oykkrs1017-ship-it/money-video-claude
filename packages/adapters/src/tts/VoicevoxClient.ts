/**
 * VoicevoxClient: VOICEVOX エンジン (http://localhost:50021) への HTTP アダプタ
 *
 * 純粋関数は wav.ts / textNormalizer.ts / speakers.ts に切り出し済み。
 * このファイルは HTTP I/O と adapter-specific エラーハンドリングのみを持つ。
 *
 * 参照契約: TtsClient port (usecases 側で定義)
 */

import * as http from 'http';
import * as https from 'https';
import { AdapterError, createLogger, type Logger } from '@money-video/shared-ts';
import { parseWavDuration } from './wav';
import { normalizeForVoicevox } from './textNormalizer';

export interface VoicevoxConfig {
  /** エンジンのベース URL（末尾スラッシュ不要） */
  baseUrl: string;
  /** 読み上げ速度倍率（1.0 = 等速, 本プロジェクト既定。地政学・固有名詞頻出のため標準速度で認知負荷を抑える） */
  speedScale: number;
  /** HTTP リクエストのタイムアウト ms */
  timeoutMs?: number;
  /**
   * 入力テキストに normalizeForVoicevox を自動適用するか（既定 true）。
   * 原典 scripts/generate-voices.ts では事前に呼ばれていたため、ユースケース側で
   * 重複適用せずとも VOICEVOX に渡る前に正規化されるように adapter 内部で吸収する。
   */
  normalizeText?: boolean;
  /** 接続エラー時の最大リトライ回数（既定 3）。HTTP 4xx はリトライしない。 */
  maxRetries?: number;
  /** リトライ初回待機 ms。指数バックオフ（1倍→2倍→4倍）（既定 1000） */
  retryDelayMs?: number;
}

export const DEFAULT_VOICEVOX_CONFIG: VoicevoxConfig = {
  baseUrl: 'http://localhost:50021',
  speedScale: 1.0,
  timeoutMs: 30_000,
  normalizeText: true,
  maxRetries: 3,
  retryDelayMs: 1_000,
};

const CONNECTION_ERROR_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']);

export interface SynthesizeInput {
  text: string;
  speakerId: number;
}

export interface SynthesizeOutput {
  /** 合成された WAV バイナリ */
  wav: Buffer;
  /** WAV ヘッダーから算出した再生秒数 */
  durationSec: number;
}

/**
 * VOICEVOX クライアント（TtsClient port の具象実装）
 *
 * ユースケース層からはこのクラスを直接参照せず、TtsClient interface を介して
 * DI する。テストでは FakeTtsClient を注入可能。
 */
export class VoicevoxClient {
  private readonly logger: Logger;

  constructor(
    private readonly config: VoicevoxConfig = DEFAULT_VOICEVOX_CONFIG,
    logger?: Logger,
  ) {
    this.logger = logger ?? createLogger({ name: 'VoicevoxClient' });
  }

  /**
   * テキスト 1 行を合成し、WAV + 再生秒数を返す。
   * VOICEVOX の 2 段階 API (audio_query → synthesis) をラップする。
   * 接続エラー時は指数バックオフで最大 maxRetries 回リトライする。
   */
  async synthesize(input: SynthesizeInput): Promise<SynthesizeOutput> {
    const { text, speakerId } = input;
    const shouldNormalize = this.config.normalizeText ?? true;
    const effectiveText = shouldNormalize ? normalizeForVoicevox(text) : text;

    return this.withRetry(async () => {
      // 1. audio_query（POST で空 body / speaker をクエリパラメータに乗せる）
      const queryUrl = `${this.config.baseUrl}/audio_query?text=${encodeURIComponent(effectiveText)}&speaker=${speakerId}`;
      const queryBuf = await this.postRaw(queryUrl, Buffer.from(''));
      const query = JSON.parse(queryBuf.toString('utf-8')) as Record<string, unknown>;

      // speedScale を適用（本プロジェクトの標準速度）
      query.speedScale = this.config.speedScale;

      // 2. synthesis（audio_query JSON をそのまま POST）
      const wav = await this.postRaw(
        `${this.config.baseUrl}/synthesis?speaker=${speakerId}`,
        Buffer.from(JSON.stringify(query)),
      );

      const durationSec = parseWavDuration(wav);
      return { wav, durationSec };
    }, `synthesize(speaker=${speakerId})`);
  }

  /**
   * 接続エラー時のみ指数バックオフでリトライするラッパー。
   * HTTP 4xx など意味的エラーはリトライしない。
   */
  private async withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
    const maxRetries = this.config.maxRetries ?? 3;
    const baseDelayMs = this.config.retryDelayMs ?? 1_000;

    let lastErr: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        const code = (err as NodeJS.ErrnoException).code ?? '';
        const isConnectionError =
          CONNECTION_ERROR_CODES.has(code) ||
          (err instanceof AdapterError &&
            /ECONNREFUSED|ECONNRESET|ETIMEDOUT|timed out/.test(err.message));

        if (!isConnectionError || attempt === maxRetries) break;

        const delayMs = baseDelayMs * 2 ** (attempt - 1);
        this.logger.warn(
          { attempt, maxRetries, delayMs, label },
          `VOICEVOX 接続エラー。${delayMs}ms 後にリトライします（${attempt}/${maxRetries}）。` +
          ` VOICEVOX が起動しているか確認してください: ${this.config.baseUrl}`,
        );
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }

    if (lastErr instanceof AdapterError) throw lastErr;
    throw new AdapterError(
      `VOICEVOX ${label} failed（${maxRetries}回リトライ後）。` +
      ` ${this.config.baseUrl} が起動していることを確認してください。` +
      ` 詳細: ${(lastErr as Error).message}`,
      'voicevox',
      lastErr,
    );
  }

  /** VOICEVOX が立ち上がっているかの簡易疎通確認。 */
  async healthCheck(): Promise<boolean> {
    try {
      const buf = await this.getRaw(`${this.config.baseUrl}/version`);
      return buf.length > 0;
    } catch {
      return false;
    }
  }

  /** 内部: 生 POST（Buffer を body として送る） */
  private postRaw(url: string, body: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;
      const req = lib.request(
        {
          hostname: urlObj.hostname,
          port: Number(urlObj.port) || (urlObj.protocol === 'https:' ? 443 : 80),
          path: urlObj.pathname + urlObj.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': body.length,
          },
          timeout: this.config.timeoutMs ?? 30_000,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            if (res.statusCode && res.statusCode >= 400) {
              reject(
                new AdapterError(
                  `VOICEVOX HTTP ${res.statusCode}: ${Buffer.concat(chunks).toString('utf-8').slice(0, 200)}`,
                  'voicevox',
                ),
              );
              return;
            }
            resolve(Buffer.concat(chunks));
          });
          res.on('error', reject);
        },
      );
      req.on('error', (e) =>
        reject(new AdapterError(`VOICEVOX request error: ${e.message}`, 'voicevox', e)),
      );
      req.on('timeout', () => {
        req.destroy(new AdapterError('VOICEVOX request timed out', 'voicevox'));
      });
      req.write(body);
      req.end();
    });
  }

  /** 内部: 生 GET */
  private getRaw(url: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const lib = urlObj.protocol === 'https:' ? https : http;
      lib
        .get(
          {
            hostname: urlObj.hostname,
            port: Number(urlObj.port) || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            timeout: this.config.timeoutMs ?? 30_000,
          },
          (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (c: Buffer) => chunks.push(c));
            res.on('end', () => resolve(Buffer.concat(chunks)));
            res.on('error', reject);
          },
        )
        .on('error', (e) =>
          reject(new AdapterError(`VOICEVOX GET error: ${e.message}`, 'voicevox', e)),
        );
    });
  }
}
