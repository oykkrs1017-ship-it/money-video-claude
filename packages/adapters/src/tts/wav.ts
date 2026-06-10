/**
 * WAV ヘッダーパーサ（純粋関数）
 *
 * 標準 44 バイトの RIFF/WAVE ヘッダーから再生時間を取り出す。
 * Python/ffprobe に依存せず、Node.js 単体で完結させるための軽量実装。
 */

import { DomainError } from '@money-video/shared-ts';

/** WAV ヘッダー内のオフセット定数 */
const WAV_OFFSET = {
  SAMPLE_RATE: 24,
  BYTE_RATE: 28,
  DATA_SIZE: 40,
} as const;

const MIN_WAV_HEADER_BYTES = 44;

/**
 * WAV Buffer から再生秒数を算出する。
 *
 * @param wavBuffer - RIFF/WAVE 形式のバイト列（最低 44 バイト必要）
 * @returns 秒単位の再生時間
 * @throws {DomainError} バッファが短すぎる／ByteRate が 0 の場合
 */
export function parseWavDuration(wavBuffer: Buffer): number {
  if (wavBuffer.length < MIN_WAV_HEADER_BYTES) {
    throw new DomainError(
      `WAV buffer too small: ${wavBuffer.length} bytes (need >= ${MIN_WAV_HEADER_BYTES})`,
    );
  }

  const byteRate = wavBuffer.readUInt32LE(WAV_OFFSET.BYTE_RATE);
  const dataSize = wavBuffer.readUInt32LE(WAV_OFFSET.DATA_SIZE);

  if (byteRate === 0) {
    throw new DomainError('Invalid WAV header: ByteRate is 0');
  }

  return dataSize / byteRate;
}

/**
 * 秒数をレンダリングフレーム数に変換する。
 * Remotion レンダリングでは末尾に固定のバッファフレームを足すのが慣習。
 *
 * @param durationSec - 秒
 * @param fps - フレームレート
 * @param bufferFrames - 末尾バッファ（デフォルト 5）
 */
export function durationToFrameCount(
  durationSec: number,
  fps: number,
  bufferFrames = 5,
): number {
  return Math.floor(durationSec * fps) + bufferFrames;
}
