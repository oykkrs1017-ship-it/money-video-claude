/**
 * EpisodeMetaReader
 *
 * YAML / props.json からアップロードメタ（title / description / tags）を読む。
 * 原典: scripts/upload-youtube.ts:loadMeta
 *
 * 解決順序:
 *   1. inputYamlPath が指定されていれば直接 YAML を読む
 *   2. propsFilePath があれば "{inputDir}/{epId}.yaml" を探す
 *   3. どちらもなければ videoFilePath のファイル名をタイトルに使う
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { AdapterError } from '@money-video/shared-ts';
import type { EpisodeMeta } from './types';

export interface MetaReadOptions {
  videoFilePath: string;
  inputYamlPath?: string;
  propsFilePath?: string;
  titleOverride?: string;
  /** YAML を検索するベースディレクトリ（省略時は videoFilePath から推論） */
  inputDir?: string;
}

/** description 末尾に付けるハッシュタグの個数上限（YouTube の仕様で最初の3つだけが動画上部に表示される） */
const DESCRIPTION_HASHTAG_LIMIT = 5;

/** YouTube タグの合計文字数上限 */
const TAG_CHAR_LIMIT = 500;

/**
 * エピソード固有タグを先頭に、ベースタグを末尾に結合し重複排除・文字数制限を適用する（純粋関数）。
 */
export function mergeTags(
  episodeTags: ReadonlyArray<string>,
  baseTags: ReadonlyArray<string>,
  maxChars = TAG_CHAR_LIMIT,
): string[] {
  const all = [...new Set([...episodeTags, ...baseTags])];
  const result: string[] = [];
  let totalChars = 0;
  for (const tag of all) {
    if (totalChars + tag.length + 1 > maxChars) break;
    result.push(tag);
    totalChars += tag.length + 1;
  }
  return result;
}

/**
 * 先頭 N 個のタグを "#tag1 #tag2" 形式で description 末尾に追加する（純粋関数）。
 * 既に description 内に同じハッシュタグが含まれている場合は重複させない。
 * 文脈 SEO 対策: YouTube 検索は description 内ハッシュタグも参照する。
 */
export function appendHashtagsToDescription(
  description: string,
  tags: ReadonlyArray<string>,
): string {
  if (tags.length === 0) return description;
  const hashtags = tags
    .slice(0, DESCRIPTION_HASHTAG_LIMIT)
    .map((t) => {
      const trimmed = t.replace(/^#+/, '').replace(/\s+/g, '');
      return trimmed.length > 0 ? `#${trimmed}` : null;
    })
    .filter((t): t is string => t !== null)
    .filter((t) => !description.includes(t));
  if (hashtags.length === 0) return description;
  const separator = description.length > 0 && !description.endsWith('\n') ? '\n\n' : '';
  return `${description}${separator}${hashtags.join(' ')}`;
}

export class EpisodeMetaReader {
  constructor(private readonly baseTags: ReadonlyArray<string> = []) {}

  async read(options: MetaReadOptions): Promise<EpisodeMeta> {
    const { videoFilePath, inputYamlPath, propsFilePath, titleOverride, inputDir } = options;

    // 1. --input で YAML パスを直接指定
    if (inputYamlPath) {
      if (!fs.existsSync(inputYamlPath)) {
        throw new AdapterError(`YAML ファイルが見つかりません: ${inputYamlPath}`, 'filesystem');
      }
      return this.parseYaml(inputYamlPath, titleOverride ?? path.basename(videoFilePath));
    }

    // 2. --props で props.json 指定 → 同名 YAML を探す
    if (propsFilePath && fs.existsSync(propsFilePath)) {
      const epId = path.basename(propsFilePath, '_props.json');
      const searchDir = inputDir ?? path.join(path.dirname(propsFilePath), '..', 'input');
      const yamlPath = path.join(searchDir, `${epId}.yaml`);
      if (fs.existsSync(yamlPath)) {
        return this.parseYaml(yamlPath, titleOverride ?? path.basename(videoFilePath));
      }
    }

    // 3. フォールバック
    return {
      title: titleOverride ?? path.basename(videoFilePath),
      description: '',
      tags: [],
    };
  }

  private parseYaml(filePath: string, fallbackTitle: string): EpisodeMeta {
    try {
      const doc = yaml.load(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown> | null;
      const rawDescription = typeof doc?.description === 'string' ? doc.description : '';
      const yamlTags = Array.isArray(doc?.tags) ? (doc.tags as string[]) : [];
      const tags = mergeTags(yamlTags, this.baseTags);
      return {
        title: (typeof doc?.title === 'string' ? doc.title : null) ?? fallbackTitle,
        description: appendHashtagsToDescription(rawDescription, tags),
        tags,
      };
    } catch (err) {
      throw new AdapterError(
        `YAML の読み込みに失敗しました: ${filePath}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }
}
