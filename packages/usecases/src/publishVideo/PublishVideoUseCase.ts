/**
 * PublishVideoUseCase
 *
 * YouTube への動画アップロードをオーケストレーションする。
 * - メタ読み込み（タグ sanitize 含む）
 * - スケジュール時刻の算出
 * - 動画アップロード
 * - 結果ファイル書き出し
 *
 * 原典: scripts/upload-youtube.ts の main IIFE（スコアカード部分を除く）。
 * スコアカード記録は CLI shim 側で行う（publish とは別責務）。
 */

import { nextScheduleTime } from './schedule';
import { sanitizeTags } from './tagSanitizer';
import type {
  PublishVideoDeps,
  PublishVideoInput,
  PublishVideoResult,
} from './ports';

export class PublishVideoUseCase {
  constructor(private readonly deps: PublishVideoDeps) {}

  async execute(input: PublishVideoInput): Promise<PublishVideoResult> {
    const { uploader, metaReader, resultWriter, logger } = this.deps;
    const {
      videoFilePath,
      inputYamlPath,
      propsFilePath,
      titleOverride,
      publishNow = false,
      inputDir,
      thumbnailPath,
      playlistId,
      isShorts = false,
    } = input;

    // 1. メタデータ読み込み
    const rawMeta = await metaReader.read({
      videoFilePath,
      inputYamlPath,
      propsFilePath,
      titleOverride,
      inputDir,
    });

    // 2. タグ sanitize（YouTube 制約: 30文字/タグ, 合計 500 バイト）
    const cleanedTags = sanitizeTags(rawMeta.tags);

    // Shorts の場合はタイトル末尾と description に #Shorts を付与（未付与のときのみ）
    const title =
      isShorts && !rawMeta.title.includes('#Shorts')
        ? `${rawMeta.title} #Shorts`
        : rawMeta.title;
    const description =
      isShorts && !rawMeta.description.includes('#Shorts')
        ? `${rawMeta.description}\n\n#Shorts`
        : rawMeta.description;

    const meta = { ...rawMeta, title, description, tags: cleanedTags };

    // 3. 公開設定
    const privacyStatus = publishNow ? 'public' : 'private';
    const publishAt = publishNow ? undefined : nextScheduleTime();

    logger.info(
      {
        videoFilePath,
        title: meta.title,
        privacyStatus,
        publishAt,
        tagCount: cleanedTags.length,
      },
      'publishVideo: uploading',
    );

    // 4. アップロード
    const uploadResult = await uploader.upload({
      videoFilePath,
      meta,
      privacyStatus,
      publishAt,
      thumbnailPath,
      playlistId,
    });

    // 5. 結果ファイル書き出し
    await resultWriter.write(videoFilePath, uploadResult);

    logger.info(
      {
        videoId: uploadResult.videoId,
        videoUrl: uploadResult.videoUrl,
      },
      'publishVideo: completed',
    );

    return {
      videoId: uploadResult.videoId,
      videoUrl: uploadResult.videoUrl,
      title: meta.title,
      privacyStatus,
      publishAt,
      tagCount: cleanedTags.length,
    };
  }
}
