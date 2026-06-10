/**
 * PublishVideoUseCase の Port 定義
 */

import type { Logger } from '@money-video/shared-ts';

/** YouTube 動画アップロード結果 */
export interface UploadResult {
  videoId: string;
  videoUrl: string;
  privacyStatus: PrivacyStatus;
  /** スケジュール投稿の場合の公開予定日時（ISO 8601 UTC） */
  publishAt?: string;
}

export type PrivacyStatus = 'public' | 'private' | 'unlisted';

/** アップロードするエピソードのメタ情報 */
export interface EpisodeMeta {
  title: string;
  description: string;
  tags: string[];
}

/** YouTube 動画アップロード Port */
export interface VideoUploader {
  upload(input: UploadInput): Promise<UploadResult>;
}

export interface UploadInput {
  /** アップロードする MP4 ファイルの絶対パス */
  videoFilePath: string;
  meta: EpisodeMeta;
  privacyStatus: PrivacyStatus;
  /** スケジュール投稿の場合: ISO 8601 UTC（即時公開なら undefined） */
  publishAt?: string;
  /** サムネイル画像ファイルの絶対パス（指定時に thumbnails.set を追加発火） */
  thumbnailPath?: string;
  /** 追加先プレイリスト ID（指定時に playlistItems.insert を発火） */
  playlistId?: string;
}

/** エピソード YAML / props.json からメタデータを読む Port */
export interface EpisodeMetaReader {
  read(options: MetaReadOptions): Promise<EpisodeMeta>;
}

export interface MetaReadOptions {
  videoFilePath: string;
  /** --input で直接 YAML パスを指定した場合 */
  inputYamlPath?: string;
  /** --props で props.json パスを指定した場合 */
  propsFilePath?: string;
  /** --title で上書きするタイトル */
  titleOverride?: string;
  /** input/ 配下の YAML を探すベースディレクトリ */
  inputDir?: string;
}

/** アップロード結果を JSON ファイルに書き出す Port */
export interface UploadResultWriter {
  write(videoFilePath: string, result: UploadResult): Promise<void>;
}

/** PublishVideo の依存バンドル */
export interface PublishVideoDeps {
  uploader: VideoUploader;
  metaReader: EpisodeMetaReader;
  resultWriter: UploadResultWriter;
  logger: Logger;
}

/** 実行入力 */
export interface PublishVideoInput {
  /** MP4 ファイルの絶対パス */
  videoFilePath: string;
  /** --input で直接 YAML パスを指定した場合 */
  inputYamlPath?: string;
  /** --props で props.json パスを指定した場合 */
  propsFilePath?: string;
  /** タイトル上書き */
  titleOverride?: string;
  /** 即時公開なら true、そうでなければ次の木曜 19:00 JST にスケジュール */
  publishNow?: boolean;
  /** input/ ディレクトリ（EpisodeMetaReader が YAML を探す基点） */
  inputDir?: string;
  /** サムネイル画像ファイルの絶対パス（--thumbnail オプションで指定） */
  thumbnailPath?: string;
  /** 追加先プレイリスト ID（--playlist オプションで指定） */
  playlistId?: string;
  /** Shorts としてアップロードする場合 true（description に #Shorts を付与） */
  isShorts?: boolean;
}

export interface PublishVideoResult {
  videoId: string;
  videoUrl: string;
  title: string;
  privacyStatus: PrivacyStatus;
  publishAt?: string;
  /** タグ件数（sanitize後） */
  tagCount: number;
}
