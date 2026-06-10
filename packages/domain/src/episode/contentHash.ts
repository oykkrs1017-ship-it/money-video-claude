import { hashSeed } from '../variation/hash';

/**
 * セリフ音声のキャッシュキーを返す（純粋関数）。
 *
 * VOICEVOX の出力 WAV は speakerId とテキストで一意に決まるため、この2つから
 * 安定したハッシュを生成する。hashSeed を2回（独立した salt 付き）通すことで
 * 実質 64bit 相当にし、エピソードをまたいだキャッシュ蓄積時の衝突を実質ゼロにする。
 *
 * 注: テキスト正規化ルール（adapters/tts/textNormalizer）を変更した場合、
 * 同一 raw テキストでも音声が変わりうるため cache/voices/ を手動クリアすること。
 */
export function lineContentHash(speakerId: number, text: string): string {
  const base = `${speakerId}::${text}`;
  // hashSeed は符号付き 32bit を返し得るため >>> 0 で符号なし化してから 16 進化する
  const h1 = (hashSeed(base) >>> 0).toString(16).padStart(8, '0');
  const h2 = (hashSeed(`${base.length}|${base}|voice-cache`) >>> 0).toString(16).padStart(8, '0');
  return h1 + h2;
}
