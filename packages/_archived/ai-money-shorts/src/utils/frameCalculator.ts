export const FPS = 30;
export const TRANSITION_FRAMES = 15;
export const CTA_FRAMES = 60;
/** YouTube Shorts 上限 180秒 */
export const MAX_FRAMES = 5400;
/** セリフ末尾バッファ: 0.3秒（tech-geo と統一） */
export const DEFAULT_BUFFER_FRAMES = 9;

/**
 * 音声長（ミリ秒）からフレーム数を計算
 * @param durationMs 音声長（ミリ秒）
 * @param bufferFrames 末尾バッファフレーム数（デフォルト9 = 0.3秒）
 */
export function msToFrames(durationMs: number, bufferFrames = DEFAULT_BUFFER_FRAMES): number {
  return Math.ceil((durationMs / 1000) * FPS) + bufferFrames;
}

/**
 * フレーム数から秒数に変換
 */
export function framesToSeconds(frames: number): number {
  return frames / FPS;
}

/**
 * フレーム数をmm:ss形式に変換
 */
export function framesToTimeString(frames: number): string {
  const totalSeconds = Math.floor(frames / FPS);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
