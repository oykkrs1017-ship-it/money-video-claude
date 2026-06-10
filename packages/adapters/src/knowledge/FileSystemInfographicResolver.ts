/**
 * FileSystemInfographicResolver
 *
 * public/content/infographic_{epId}_N.png を存在順に列挙して返す。
 * 番号が連続しなくなった時点で打ち切る（原典の挙動）。
 *
 * 原典: scripts/generate-script.ts:injectInfographics 前半の走査処理
 */

import * as fs from 'fs';
import * as path from 'path';

export interface InfographicResolverConfig {
  /** public/content を指すディレクトリ（絶対パス推奨） */
  contentDir: string;
  /** 最大スキャン枚数（既定 10） */
  maxPerEpisode?: number;
  /**
   * script-input（YAML）から参照するときの相対パスプレフィックス。
   * 既定は "content" → "content/infographic_ep007_1.png" のような値になる。
   */
  relativePrefix?: string;
}

const DEFAULT_MAX = 10;
const DEFAULT_PREFIX = 'content';

export class FileSystemInfographicResolver {
  private readonly contentDir: string;
  private readonly maxPerEpisode: number;
  private readonly relativePrefix: string;

  constructor(config: InfographicResolverConfig) {
    this.contentDir = config.contentDir;
    this.maxPerEpisode = config.maxPerEpisode ?? DEFAULT_MAX;
    this.relativePrefix = config.relativePrefix ?? DEFAULT_PREFIX;
  }

  async listForEpisode(epId: string): Promise<string[]> {
    const results: string[] = [];
    for (let i = 1; i <= this.maxPerEpisode; i++) {
      const fileName = `infographic_${epId}_${i}.png`;
      const abs = path.join(this.contentDir, fileName);
      if (!(await this.exists(abs))) break;
      results.push(`${this.relativePrefix}/${fileName}`);
    }
    return results;
  }

  private async exists(p: string): Promise<boolean> {
    try {
      await fs.promises.access(p, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}
