/**
 * YtDlpCorpusFetcher
 *
 * yt-dlp を使って YouTube 動画の詳細コーパス（メタデータ・サムネ・字幕）を収集する。
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawnSync } from 'child_process';
import type { CompetitorChannel, CorpusVideoMeta } from './types';

/** CorpusVideoFetcher port との shape 互換を保つ */
export interface CorpusVideoFetcher {
  isAvailable(): boolean;
  listVideoIds(channel: CompetitorChannel, topN: number, dryRun: boolean): string[];
  fetchVideoCorpus(
    videoId: string,
    channel: CompetitorChannel,
    outputDir: string,
    dryRun: boolean,
  ): CorpusVideoMeta | null;
}

const DEFAULT_LIST_TIMEOUT_MS = 45_000;
const DEFAULT_META_TIMEOUT_MS = 30_000;
const DEFAULT_THUMB_TIMEOUT_MS = 20_000;
const DEFAULT_SUBS_TIMEOUT_MS = 20_000;

export class YtDlpCorpusFetcher implements CorpusVideoFetcher {
  private readonly available: boolean;

  constructor() {
    this.available = checkYtDlp();
  }

  isAvailable(): boolean {
    return this.available;
  }

  listVideoIds(channel: CompetitorChannel, topN: number, dryRun: boolean): string[] {
    const url = `https://www.youtube.com/${channel.handle}/videos`;

    if (dryRun) {
      return ['dryrun_vid_001', 'dryrun_vid_002'];
    }

    const result = spawnSync(
      'yt-dlp',
      [
        '--flat-playlist',
        '--playlist-items', `1:${topN}`,
        '--print', '%(id)s',
        '--no-warnings',
        '--encoding', 'utf-8',
        url,
      ],
      { encoding: 'utf8', timeout: DEFAULT_LIST_TIMEOUT_MS },
    );

    if (result.status !== 0 || !result.stdout.trim()) return [];

    return result.stdout
      .trim()
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  fetchVideoCorpus(
    videoId: string,
    channel: CompetitorChannel,
    outputDir: string,
    dryRun: boolean,
  ): CorpusVideoMeta | null {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    if (dryRun) {
      const meta: CorpusVideoMeta = {
        id: videoId,
        title: `[DRY-RUN] ${channel.name} サンプル動画`,
        channel: channel.name,
        channelHandle: channel.handle,
        views: 50000,
        likes: 2000,
        published: new Date().toISOString().slice(0, 10),
        duration: 600,
        url: videoUrl,
        description: 'DRY-RUN モードのサンプル説明文',
        tags: ['テック', '投資'],
        collectedAt: new Date().toISOString(),
      };
      fs.writeFileSync(
        path.join(outputDir, 'metadata.json'),
        JSON.stringify(meta, null, 2),
        'utf8',
      );
      return meta;
    }

    // ─ メタデータ取得 ─
    spawnSync(
      'yt-dlp',
      [
        '--no-playlist',
        '--skip-download',
        '--write-info-json',
        '--output', path.join(outputDir, '%(id)s'),
        '--no-warnings',
        '--encoding', 'utf-8',
        videoUrl,
      ],
      { encoding: 'utf8', timeout: DEFAULT_META_TIMEOUT_MS },
    );

    // yt-dlp が出力した info.json を読み込む
    let infoJsonPath = path.join(outputDir, `${videoId}.info.json`);
    if (!fs.existsSync(infoJsonPath)) {
      const files = fs.readdirSync(outputDir).filter((f) => f.endsWith('.info.json'));
      if (files.length === 0) return null;
      const latest = files.sort().at(-1)!;
      infoJsonPath = path.join(outputDir, latest);
    }

    let rawInfo: Record<string, unknown>;
    try {
      rawInfo = JSON.parse(fs.readFileSync(infoJsonPath, 'utf8')) as Record<string, unknown>;
    } catch {
      return null;
    }

    const meta: CorpusVideoMeta = {
      id: videoId,
      title: (rawInfo['title'] as string) ?? '（タイトル不明）',
      channel: channel.name,
      channelHandle: channel.handle,
      views: typeof rawInfo['view_count'] === 'number' ? rawInfo['view_count'] : null,
      likes: typeof rawInfo['like_count'] === 'number' ? rawInfo['like_count'] : null,
      published: typeof rawInfo['upload_date'] === 'string'
        ? formatUploadDate(rawInfo['upload_date'] as string)
        : null,
      duration: typeof rawInfo['duration'] === 'number' ? rawInfo['duration'] : null,
      url: videoUrl,
      description: ((rawInfo['description'] as string) ?? '').slice(0, 500),
      tags: Array.isArray(rawInfo['tags']) ? (rawInfo['tags'] as string[]).slice(0, 20) : [],
      collectedAt: new Date().toISOString(),
    };

    // info.json → metadata.json に変換して保存（不要フィールド削除）
    fs.writeFileSync(
      path.join(outputDir, 'metadata.json'),
      JSON.stringify(meta, null, 2),
      'utf8',
    );
    // 元の info.json は削除（容量節約）
    if (fs.existsSync(infoJsonPath)) {
      fs.unlinkSync(infoJsonPath);
    }

    // ─ サムネイル取得 ─
    const thumbPath = path.join(outputDir, 'thumbnail.jpg');
    if (!fs.existsSync(thumbPath)) {
      spawnSync(
        'yt-dlp',
        [
          '--no-playlist',
          '--skip-download',
          '--write-thumbnail',
          '--convert-thumbnails', 'jpg',
          '--output', path.join(outputDir, 'thumbnail'),
          '--no-warnings',
          videoUrl,
        ],
        { encoding: 'utf8', timeout: DEFAULT_THUMB_TIMEOUT_MS },
      );
    }

    // ─ 字幕取得（日本語自動生成のみ、失敗しても続行）─
    const subsPath = path.join(outputDir, 'subs.ja.vtt');
    if (!fs.existsSync(subsPath)) {
      spawnSync(
        'yt-dlp',
        [
          '--no-playlist',
          '--skip-download',
          '--write-auto-subs',
          '--sub-lang', 'ja',
          '--sub-format', 'vtt',
          '--output', path.join(outputDir, 'subs'),
          '--no-warnings',
          videoUrl,
        ],
        { encoding: 'utf8', timeout: DEFAULT_SUBS_TIMEOUT_MS },
      );
      // yt-dlp が出力するファイル名が異なる場合はリネーム
      const vttFiles = fs.readdirSync(outputDir).filter((f) => f.endsWith('.vtt'));
      if (vttFiles.length > 0 && !fs.existsSync(subsPath)) {
        fs.renameSync(path.join(outputDir, vttFiles[0]!), subsPath);
      }
    }

    return meta;
  }
}

function checkYtDlp(): boolean {
  try {
    const result = spawnSync('yt-dlp', ['--version'], { encoding: 'utf8' });
    return result.status === 0;
  } catch {
    return false;
  }
}

function formatUploadDate(uploadDate: string): string | null {
  if (uploadDate.length !== 8) return null;
  return `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`;
}
