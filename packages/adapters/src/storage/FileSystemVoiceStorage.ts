/**
 * FileSystemVoiceStorage
 *
 * ローカルファイルシステムに WAV を保存する VoiceStorage の具象実装。
 * 保存先は `baseDir` からの相対パス。テストでは FakeVoiceStorage が使用される。
 */

import * as fs from 'fs';
import * as path from 'path';
import { AdapterError } from '@money-video/shared-ts';

export class FileSystemVoiceStorage {
  /**
   * @param baseDir - 相対パス解決のルート（例: `packages/tech-geopolitics-channel/public`）
   */
  constructor(private readonly baseDir: string) {}

  async saveWav(relativePath: string, data: Buffer): Promise<void> {
    const abs = this.resolveAbs(relativePath);
    try {
      await fs.promises.mkdir(path.dirname(abs), { recursive: true });
      await fs.promises.writeFile(abs, data);
    } catch (err) {
      throw new AdapterError(
        `Failed to write WAV to ${abs}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  async ensureDirectory(relativePath: string): Promise<void> {
    const abs = this.resolveAbs(relativePath);
    try {
      await fs.promises.mkdir(abs, { recursive: true });
    } catch (err) {
      throw new AdapterError(
        `Failed to create directory ${abs}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  private resolveAbs(relativePath: string): string {
    return path.isAbsolute(relativePath)
      ? relativePath
      : path.resolve(this.baseDir, relativePath);
  }
}
