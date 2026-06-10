/**
 * DailyCostTsvReader
 *
 * brain/results.tsv から本日分の API コストを集計する。
 * DailyCostReader ポートを実装。
 */

import * as fs from 'fs';
import * as path from 'path';

export interface DailyCostReader {
  getTodayTotalUsd(): number;
}

export class DailyCostTsvReader implements DailyCostReader {
  private readonly tsvPath: string;

  constructor(rootDir: string) {
    this.tsvPath = path.join(rootDir, 'brain', 'results.tsv');
  }

  getTodayTotalUsd(): number {
    if (!fs.existsSync(this.tsvPath)) return 0;

    const today = new Date().toISOString().slice(0, 10);
    const lines = fs.readFileSync(this.tsvPath, 'utf8').split('\n').slice(1); // ヘッダーをスキップ

    return lines
      .filter((l) => l.includes(today))
      .reduce((sum, l) => {
        const cols = l.split('\t');
        // 8列目 (index 7) がコスト (USD)
        const cost = parseFloat(cols[7] ?? '0');
        return sum + (isNaN(cost) ? 0 : cost);
      }, 0);
  }
}
