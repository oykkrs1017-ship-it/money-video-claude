/**
 * FileSystemVoiceCache
 *
 * content hash をキーに音声 WAV と秒数をローカルに保存する VoiceCache の具象実装。
 * 保存先は `cache/voices/{key}.wav` + `{key}.json`（{ durationSec }）。
 *
 * 読取失敗・破損時は null（キャッシュミス扱い）を返し、呼び出し側が再生成できるようにする。
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdapterError } from '@money-video/shared-ts';

export class FileSystemVoiceCache {
  /**
   * @param baseDir - キャッシュのルート（例: `packages/tech-geopolitics-channel/cache/voices`）
   */
  constructor(private readonly baseDir: string) {}

  async get(key: string): Promise<{ wav: Buffer; durationSec: number } | null> {
    const wavPath = this.wavPath(key);
    const metaPath = this.metaPath(key);
    try {
      if (!fs.existsSync(wavPath) || !fs.existsSync(metaPath)) return null;
      const [wav, metaRaw] = await Promise.all([
        fs.promises.readFile(wavPath),
        fs.promises.readFile(metaPath, 'utf-8'),
      ]);
      const meta = JSON.parse(metaRaw) as { durationSec?: unknown };
      if (typeof meta.durationSec !== 'number' || !Number.isFinite(meta.durationSec)) {
        return null;
      }
      return { wav, durationSec: meta.durationSec };
    } catch {
      // 破損・読取不能はキャッシュミスとして扱い、再生成に委ねる
      return null;
    }
  }

  async set(key: string, value: { wav: Buffer; durationSec: number }): Promise<void> {
    try {
      await fs.promises.mkdir(this.baseDir, { recursive: true });
      await fs.promises.writeFile(this.wavPath(key), value.wav);
      await fs.promises.writeFile(
        this.metaPath(key),
        JSON.stringify({ durationSec: value.durationSec }),
        'utf-8',
      );
    } catch (err) {
      throw new AdapterError(
        `Failed to write voice cache ${key}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  private wavPath(key: string): string {
    return path.join(this.baseDir, `${key}.wav`);
  }

  private metaPath(key: string): string {
    return path.join(this.baseDir, `${key}.json`);
  }
}
