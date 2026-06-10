/**
 * FileSystemCorpusReader
 *
 * knowledge/corpus/ ディレクトリから VideoMetaForAnalysis 一覧を読み込む。
 */

import * as fs from 'fs';
import * as path from 'path';
import type { VideoMetaForAnalysis } from './types';

/** CorpusReader port との shape 互換を保つ */
export interface CorpusReader {
  loadAll(corpusDir: string): VideoMetaForAnalysis[];
}

export class FileSystemCorpusReader implements CorpusReader {
  loadAll(corpusDir: string): VideoMetaForAnalysis[] {
    if (!fs.existsSync(corpusDir)) {
      return [];
    }

    const videos: VideoMetaForAnalysis[] = [];

    const channelDirs = fs.readdirSync(corpusDir).filter((d) => {
      const fullPath = path.join(corpusDir, d);
      return fs.statSync(fullPath).isDirectory() && d !== 'index.json';
    });

    for (const channelDir of channelDirs) {
      const channelPath = path.join(corpusDir, channelDir);
      const videoDirs = fs.readdirSync(channelPath).filter((d) => {
        return fs.statSync(path.join(channelPath, d)).isDirectory();
      });

      for (const videoDir of videoDirs) {
        const metaPath = path.join(channelPath, videoDir, 'metadata.json');
        if (!fs.existsSync(metaPath)) continue;
        try {
          const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8')) as VideoMetaForAnalysis;
          videos.push(meta);
        } catch {
          // パースエラーはスキップ
        }
      }
    }

    return videos;
  }
}
