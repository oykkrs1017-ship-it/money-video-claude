/**
 * GenerateVoiceUseCase の Port 定義
 *
 * ユースケースは外部 I/O を直接呼ばず、これらの interface を介してのみ
 * 依存を参照する。具象実装は adapters 側で提供し、CLI 側で DI する。
 *
 * テストでは Fake 実装（`@money-video/usecases/testing` 予定）を注入して
 * ネットワーク非依存で完走させる。
 */

import type { ScriptInput, SpeakerType } from '@money-video/domain';
import type { Logger } from '@money-video/shared-ts';

/** TTS 合成クライアント（VoicevoxClient が実装する） */
export interface TtsClient {
  synthesize(input: {
    text: string;
    speakerId: number;
  }): Promise<{ wav: Buffer; durationSec: number }>;
}

/** 音声ファイルの保存先（FileSystemStorage が実装する） */
export interface VoiceStorage {
  /**
   * WAV を保存し、script-input から参照可能な相対パス（例: "voices/0001_maro.wav"）を返す。
   */
  saveWav(relativePath: string, data: Buffer): Promise<void>;
  /** 保存ディレクトリが存在しなければ作成する。 */
  ensureDirectory(relativePath: string): Promise<void>;
}

/** script-input.json の入出力（FileSystemScriptStore が実装する） */
export interface ScriptStore {
  load(inputPath: string): Promise<ScriptInput>;
  save(inputPath: string, data: ScriptInput): Promise<void>;
}

/**
 * 音声合成結果のキャッシュ（content hash キー、FileSystemVoiceCache が実装する）。
 * 未注入時はキャッシュ無効（毎回 TTS を呼ぶ旧挙動）。
 */
export interface VoiceCache {
  /** ヒット時は WAV と秒数を返す。ミス・読取失敗時は null。 */
  get(key: string): Promise<{ wav: Buffer; durationSec: number } | null>;
  set(key: string, value: { wav: Buffer; durationSec: number }): Promise<void>;
}

/** Speaker type → VOICEVOX speaker ID 解決（adapters/tts/speakers が実装する） */
export type SpeakerResolver = (speaker: SpeakerType | string) => number;

/** GenerateVoice の依存バンドル */
export interface GenerateVoiceDeps {
  tts: TtsClient;
  storage: VoiceStorage;
  scriptStore: ScriptStore;
  resolveSpeakerId: SpeakerResolver;
  logger: Logger;
  /** 任意。注入すると content hash による音声キャッシュが有効になる。 */
  voiceCache?: VoiceCache;
}

/** 実行入力（CLI 引数からマップされる） */
export interface GenerateVoiceInput {
  /** 入力 script-input JSON の絶対パス */
  inputPath: string;
  /** 保存先ディレクトリ（script-input からの相対パスのベース）。例: "voices" */
  voicesDirRelative: string;
  /** レンダリング fps（frameCount 算出に使用） */
  fps: number;
  /** 末尾バッファフレーム（既存挙動との互換性のため既定 5） */
  bufferFrames?: number;
}

/** 実行結果（サマリ情報） */
export interface GenerateVoiceResult {
  /** 合成成功セリフ数 */
  successCount: number;
  /** 合成失敗セリフ数（フォールバック処理済み） */
  failureCount: number;
  /** 合計秒数（WAV から算出した total duration） */
  totalDurationSec: number;
  /** キャッシュヒット数（TTS を呼ばずに復元したセリフ数） */
  cacheHits: number;
}
