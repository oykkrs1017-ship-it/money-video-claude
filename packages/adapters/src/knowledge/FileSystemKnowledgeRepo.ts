/**
 * FileSystemKnowledgeRepo
 *
 * モノレポ直下の knowledge/ から directive.yaml / winning-patterns.json を読む。
 * research ファイル（input/ 直下）は tech-geopolitics-channel ベース相対で読む。
 *
 * 原典: scripts/generate-script.ts の loadDirective / loadWinningPatterns
 *
 * 設計メモ:
 *   - 読めない（ファイル不在・パース失敗）場合は null を返す（呼び出し側でフォールバック）
 *   - 例外的な I/O エラー（権限等）は AdapterError で再投げる
 *   - パスは constructor で baseDir（tech-geopolitics-channel のような package root）を受け取る
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AdapterError } from '@money-video/shared-ts';

export interface KnowledgeRepoConfig {
  /** tech-geopolitics-channel など、research ファイル相対解決の基準ディレクトリ */
  packageRoot: string;
  /** モノレポ直下の knowledge/ ディレクトリ（省略時は packageRoot/../../knowledge） */
  knowledgeDir?: string;
}

export class FileSystemKnowledgeRepo {
  private readonly packageRoot: string;
  private readonly knowledgeDir: string;

  constructor(config: KnowledgeRepoConfig) {
    this.packageRoot = config.packageRoot;
    this.knowledgeDir =
      config.knowledgeDir ?? path.resolve(config.packageRoot, '..', '..', 'knowledge');
  }

  async loadDirective(): Promise<Record<string, unknown> | null> {
    const filePath = path.join(this.knowledgeDir, 'directive.yaml');
    if (!(await this.fileExists(filePath))) return null;
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      const parsed = yaml.load(raw);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as Record<string, unknown>;
    } catch (err) {
      throw new AdapterError(
        `Failed to load directive.yaml: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  async loadWinningPatterns(): Promise<Record<string, unknown> | null> {
    const filePath = path.join(this.knowledgeDir, 'winning-patterns.json');
    if (!(await this.fileExists(filePath))) return null;
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      throw new AdapterError(
        `Failed to load winning-patterns.json: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  async loadTopicResearch(): Promise<Record<string, unknown> | null> {
    const filePath = path.join(this.knowledgeDir, 'topic-research.json');
    if (!(await this.fileExists(filePath))) return null;
    try {
      const raw = await fs.promises.readFile(filePath, 'utf-8');
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      throw new AdapterError(
        `Failed to load topic-research.json: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  async loadResearchFile(relativePath: string): Promise<string | null> {
    const abs = path.isAbsolute(relativePath)
      ? relativePath
      : path.resolve(this.packageRoot, relativePath);
    if (!(await this.fileExists(abs))) return null;
    try {
      return await fs.promises.readFile(abs, 'utf-8');
    } catch (err) {
      throw new AdapterError(
        `Failed to load research file ${abs}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }

  private async fileExists(p: string): Promise<boolean> {
    try {
      await fs.promises.access(p, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }
}
