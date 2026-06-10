/**
 * YtDlpCompetitorVideoFetcher
 *
 * yt-dlp CLI を使って YouTube 競合チャンネルの最新動画を取得する。
 * yt-dlp が未インストールの場合は isAvailable() が false を返す。
 */

import { spawnSync } from 'child_process';
import type { CompetitorChannel, CompetitorVideo } from './types';

/** CompetitorVideoFetcher port との shape 互換を保つ */
export interface CompetitorVideoFetcher {
  isAvailable(): boolean;
  fetch(channel: CompetitorChannel, maxVideos: number, dryRun: boolean): CompetitorVideo[];
}

const YT_DLP_TIMEOUT_MS = 30_000;

export class YtDlpCompetitorVideoFetcher implements CompetitorVideoFetcher {
  private readonly ytDlpAvailable: boolean;

  constructor() {
    this.ytDlpAvailable = checkYtDlp();
  }

  isAvailable(): boolean {
    return this.ytDlpAvailable;
  }

  fetch(channel: CompetitorChannel, maxVideos: number, dryRun: boolean): CompetitorVideo[] {
    const channelUrl = `https://www.youtube.com/${channel.handle}/videos`;

    if (dryRun) {
      return [
        {
          channel: channel.name,
          title: `[DRY-RUN] ${channel.name} のサンプル動画タイトル`,
          views: 10000,
          published: new Date().toISOString().slice(0, 10),
          url: channelUrl,
          duration: '12:34',
        },
      ];
    }

    const result = spawnSync(
      'yt-dlp',
      [
        '--flat-playlist',
        '--playlist-items',
        `1:${maxVideos}`,
        '--print',
        '%(title)s\t%(view_count)s\t%(upload_date)s\t%(webpage_url)s\t%(duration_string)s',
        '--no-warnings',
        '--encoding',
        'utf-8',
        channelUrl,
      ],
      { encoding: 'utf8', timeout: YT_DLP_TIMEOUT_MS },
    );

    if (result.status !== 0 || !result.stdout.trim()) {
      return [];
    }

    const videos: CompetitorVideo[] = [];
    for (const line of result.stdout.trim().split('\n')) {
      const parts = line.split('\t');
      if (parts.length < 4) continue;
      const [title, viewsStr, uploadDate, url, duration] = parts;

      const views = viewsStr && viewsStr !== 'NA' ? parseInt(viewsStr, 10) : null;
      let published: string | null = null;
      if (uploadDate && uploadDate.length === 8) {
        published = `${uploadDate.slice(0, 4)}-${uploadDate.slice(4, 6)}-${uploadDate.slice(6, 8)}`;
      }

      videos.push({
        channel: channel.name,
        title: title ?? '（タイトル不明）',
        views,
        published,
        url: url ?? channelUrl,
        duration: duration ?? null,
      });
    }

    return videos;
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
