/**
 * FileSystemPastEpisodesResolver
 *
 * input/ ディレクトリの *.yaml を走査し、過去エピソードの epId / title /
 * 最初のチャプター topic を返す。台本生成時に「この内容と被らないように」と
 * LLM へ明示するための材料になる。
 *
 * - 現在生成中の epId は除外
 * - ファイルの更新時刻（mtime）で新しい順にソート
 * - limit で件数を絞る（直近 5〜10 件程度が想定）
 * - パース失敗・title 欠損のファイルはスキップ（スコアカード不要）
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AdapterError } from '@money-video/shared-ts';

export interface PastEpisodeSummary {
  epId: string;
  title: string;
  topic?: string;
}

export interface PastEpisodesResolverConfig {
  /** input/ ディレクトリの絶対パス */
  inputDir: string;
}

interface ScriptYamlShape {
  title?: unknown;
  chapters?: Array<{ topic?: unknown }>;
}

export class FileSystemPastEpisodesResolver {
  private readonly inputDir: string;

  constructor(config: PastEpisodesResolverConfig) {
    this.inputDir = config.inputDir;
  }

  async listRecent(excludeEpId: string, limit: number): Promise<PastEpisodeSummary[]> {
    if (!(await this.dirExists(this.inputDir))) return [];

    let entries: string[];
    try {
      entries = await fs.promises.readdir(this.inputDir);
    } catch (err) {
      throw new AdapterError(
        `Failed to read input dir ${this.inputDir}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }

    const yamlFiles = entries.filter((f) => f.endsWith('.yaml'));

    const enriched = await Promise.all(
      yamlFiles.map(async (f) => {
        const abs = path.join(this.inputDir, f);
        try {
          const stat = await fs.promises.stat(abs);
          return { file: f, abs, mtimeMs: stat.mtimeMs };
        } catch {
          return null;
        }
      }),
    );

    const sorted = enriched
      .filter((e): e is { file: string; abs: string; mtimeMs: number } => e !== null)
      .sort((a, b) => b.mtimeMs - a.mtimeMs);

    const results: PastEpisodeSummary[] = [];
    for (const e of sorted) {
      if (results.length >= limit) break;

      const epId = path.basename(e.file, '.yaml');
      if (epId === excludeEpId) continue;

      const summary = await this.readSummary(e.abs, epId);
      if (summary) results.push(summary);
    }

    return results;
  }

  private async readSummary(
    absPath: string,
    epId: string,
  ): Promise<PastEpisodeSummary | null> {
    try {
      const raw = await fs.promises.readFile(absPath, 'utf-8');
      const doc = yaml.load(raw) as ScriptYamlShape | null;
      if (!doc || typeof doc !== 'object') return null;

      const title = typeof doc.title === 'string' ? doc.title : '';
      if (!title) return null;

      const firstTopicRaw = Array.isArray(doc.chapters) ? doc.chapters[0]?.topic : undefined;
      const topic = typeof firstTopicRaw === 'string' ? firstTopicRaw : undefined;

      return { epId, title, topic };
    } catch {
      return null;
    }
  }

  private async dirExists(p: string): Promise<boolean> {
    try {
      const stat = await fs.promises.stat(p);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
