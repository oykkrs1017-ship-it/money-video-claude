/**
 * InputDirEpisodeIdGenerator
 *
 * input/ ディレクトリ内の最大エピソード番号 + 1 で次 ID を採番する。
 * EpisodeIdGenerator ポートを実装。
 */

import * as fs from 'fs';
import * as path from 'path';

export interface EpisodeIdGenerator {
  next(): string;
}

export class InputDirEpisodeIdGenerator implements EpisodeIdGenerator {
  private readonly inputDir: string;

  constructor(packageDir: string) {
    this.inputDir = path.join(packageDir, 'input');
  }

  next(): string {
    if (!fs.existsSync(this.inputDir)) {
      fs.mkdirSync(this.inputDir, { recursive: true });
    }

    const epNums = fs
      .readdirSync(this.inputDir)
      .map((f) => f.match(/^ep(\d+)/)?.[1])
      .filter((n): n is string => n != null)
      .map(Number);

    const next = epNums.length > 0 ? Math.max(...epNums) + 1 : 1;
    return `ep${String(next).padStart(3, '0')}`;
  }
}
