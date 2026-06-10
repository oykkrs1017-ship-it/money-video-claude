/**
 * YouTubeUploader: YouTube Data API v3 で動画をアップロードする
 *
 * googleapis.google.youtube を使用。OAuth2Client は YouTubeAuth から受け取る。
 */

import * as fs from 'fs';
import { google } from 'googleapis';
import { AdapterError } from '@money-video/shared-ts';
import type { GoogleOAuth2Client } from './YouTubeAuth';
import type { EpisodeMeta, PrivacyStatus, UploadInput, UploadResult } from './types';

export { EpisodeMeta, PrivacyStatus, UploadInput, UploadResult };

// YouTube カテゴリID 22 (People & Blogs) を採用。
// 投資・解説系チャンネル（AIマネー研究所と同カテゴリ）のアルゴリズム親和性を優先し、
// 旧値 25 (News & Politics) をやめる。News & Politics はニュース速報向けで、
// 解説チャンネルはレコメンド網に乗りにくい。
const CATEGORY_ID = '22';

export interface YouTubeUploaderConfig {
  auth: GoogleOAuth2Client;
}

export class YouTubeUploader {
  private readonly auth: GoogleOAuth2Client;

  constructor(config: YouTubeUploaderConfig) {
    this.auth = config.auth;
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const { videoFilePath, meta, privacyStatus, publishAt, thumbnailPath, playlistId } = input;

    if (!fs.existsSync(videoFilePath)) {
      throw new AdapterError(`動画ファイルが見つかりません: ${videoFilePath}`, 'youtube');
    }

    if (thumbnailPath && !fs.existsSync(thumbnailPath)) {
      throw new AdapterError(
        `サムネイルファイルが見つかりません: ${thumbnailPath}`,
        'filesystem',
      );
    }

    const fileSize = fs.statSync(videoFilePath).size;
    // googleapis.google.options で auth を注入することで型エラーを回避する
    const youtube = google.youtube({ version: 'v3', auth: this.auth as Parameters<typeof google.youtube>[0]['auth'] });

    let lastProgress = 0;

    try {
      const res = await youtube.videos.insert(
        {
          part: ['snippet', 'status'],
          requestBody: {
            snippet: {
              title: meta.title,
              description: meta.description,
              tags: meta.tags,
              categoryId: CATEGORY_ID,
              defaultLanguage: 'ja',
            },
            status: {
              privacyStatus,
              ...(publishAt ? { publishAt } : {}),
              selfDeclaredMadeForKids: false,
              containsSyntheticMedia: true,
            },
          },
          media: {
            body: fs.createReadStream(videoFilePath),
          },
        },
        {
          onUploadProgress: (evt: { bytesRead: number }) => {
            const progress = Math.round((evt.bytesRead / fileSize) * 100);
            if (progress >= lastProgress + 5) {
              process.stdout.write(
                `\r   進捗: ${progress}% (${(evt.bytesRead / 1024 / 1024).toFixed(1)} MB / ${(fileSize / 1024 / 1024).toFixed(1)} MB)`,
              );
              lastProgress = progress;
            }
          },
        },
      );

      process.stdout.write('\n');

      const videoId = res.data.id;
      if (!videoId) {
        throw new AdapterError('YouTube API が videoId を返しませんでした', 'youtube');
      }

      if (thumbnailPath) {
        try {
          await youtube.thumbnails.set({
            videoId,
            media: {
              mimeType: 'image/png',
              body: fs.createReadStream(thumbnailPath),
            },
          });
        } catch (thumbErr) {
          // サムネイル送信の失敗は動画アップロード自体の成功を覆さない。
          // CLI/ログで気付けるように stderr に警告を出して続行する。
          process.stderr.write(
            `⚠️  サムネイル送信失敗: ${(thumbErr as Error).message}\n`,
          );
        }
      }

      if (playlistId) {
        try {
          await youtube.playlistItems.insert({
            part: ['snippet'],
            requestBody: {
              snippet: {
                playlistId,
                resourceId: { kind: 'youtube#video', videoId },
              },
            },
          });
        } catch (plErr) {
          process.stderr.write(
            `⚠️  プレイリスト追加失敗: ${(plErr as Error).message}\n`,
          );
        }
      }

      return {
        videoId,
        videoUrl: `https://youtu.be/${videoId}`,
        privacyStatus,
        publishAt,
      };
    } catch (err) {
      if (err instanceof AdapterError) throw err;
      throw new AdapterError(
        `YouTube videos.insert に失敗しました: ${(err as Error).message}`,
        'youtube',
        err,
      );
    }
  }
}
