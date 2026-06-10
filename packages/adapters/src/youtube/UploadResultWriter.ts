/**
 * UploadResultWriter
 *
 * アップロード結果を {videoFile}_upload_result.json に書き出す。
 * 原典: scripts/upload-youtube.ts の resultPath 書き込み部分。
 */

import * as fs from 'fs';
import { AdapterError } from '@money-video/shared-ts';
import type { UploadResult } from './types';

export class UploadResultWriter {
  async write(videoFilePath: string, result: UploadResult): Promise<void> {
    const resultPath = videoFilePath.replace(/\.mp4$/, '_upload_result.json');
    const payload = {
      videoId: result.videoId,
      videoUrl: result.videoUrl,
      privacyStatus: result.privacyStatus,
      ...(result.publishAt
        ? {
            publishAt: result.publishAt,
            scheduleJST: new Date(result.publishAt).toLocaleString('ja-JP', {
              timeZone: 'Asia/Tokyo',
            }),
          }
        : {}),
      uploadedAt: new Date().toISOString(),
    };
    try {
      await fs.promises.writeFile(resultPath, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err) {
      throw new AdapterError(
        `アップロード結果の書き込みに失敗しました: ${resultPath}: ${(err as Error).message}`,
        'filesystem',
        err,
      );
    }
  }
}
