/**
 * YouTube adapter 内で使う共有型。
 * usecases 側の ports.ts と同一シェイプを保つ（adapter が usecases に依存しないため別定義）。
 */

export type PrivacyStatus = 'public' | 'private' | 'unlisted';

export interface EpisodeMeta {
  title: string;
  description: string;
  tags: string[];
}

export interface UploadInput {
  videoFilePath: string;
  meta: EpisodeMeta;
  privacyStatus: PrivacyStatus;
  publishAt?: string;
  /** サムネイル画像ファイルの絶対パス（未指定なら自動生成サムネに任せる） */
  thumbnailPath?: string;
  /** 追加先プレイリスト ID（指定時に playlistItems.insert を発火） */
  playlistId?: string;
}

export interface UploadResult {
  videoId: string;
  videoUrl: string;
  privacyStatus: PrivacyStatus;
  publishAt?: string;
}
